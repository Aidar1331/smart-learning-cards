import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'crypto';
import { Redis } from 'redis';

interface FlashCardRequest {
  text: string;
  cardCount?: number;
  userId?: string;
}

interface ExtractedFlashCard {
  front: string;
  back: string;
  source_fragment: string;
  confidence: number;
}

interface FlashCardResponse {
  success: boolean;
  flashcards?: ExtractedFlashCard[];
  count?: number;
  cached?: boolean;
  error?: string;
}

// Строгий промпт для точного извлечения фактов
const STRICT_EXTRACTION_PROMPT = `
Ты - эксперт по точному извлечению фактов из учебных материалов. 
КРИТИЧЕСКИ ВАЖНО: извлекай ТОЛЬКО факты из текста БЕЗ изменений и интерпретаций.

СТРОГИЕ ТРЕБОВАНИЯ:
1. ТОЧНО извлекай факты, определения, формулы, даты как они написаны в тексте
2. НЕ ИЗМЕНЯЙ формулировки - используй ТОЧНЫЕ цитаты из исходника
3. НЕ ДОБАВЛЯЙ информацию не из текста - только то что есть
4. НЕ ИНТЕРПРЕТИРУЙ и НЕ УПРОЩАЙ - бери как есть
5. Если определение неполное в тексте - бери неполное
6. Создай максимум {cardCount} карточек

ФОРМАТ ОТВЕТА - только JSON:
[{
  "front": "Точный термин из текста (1-10 слов)",
  "back": "Точное определение из текста без изменений (до 200 слов)", 
  "source_fragment": "...оригинальный фрагмент текста...",
  "confidence": число от 1 до 10
}]

КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО: 
- Добавлять информацию извне
- Изменять определения 
- Упрощать формулировки
- Интерпретировать контент

ТЕКСТ ДЛЯ АНАЛИЗА:
{text}
`;

// Валидация извлеченных карточек
function validateCards(cards: any[]): ExtractedFlashCard[] {
  if (!Array.isArray(cards)) {
    return [];
  }

  return cards.filter((card): card is ExtractedFlashCard => {
    return (
      typeof card === 'object' &&
      typeof card.front === 'string' &&
      card.front.length > 0 &&
      card.front.split(' ').length <= 10 &&
      typeof card.back === 'string' &&
      card.back.length > 0 &&
      card.back.length <= 200 &&
      typeof card.source_fragment === 'string' &&
      card.source_fragment.length > 0 &&
      typeof card.confidence === 'number' &&
      card.confidence >= 1 &&
      card.confidence <= 10
    );
  }).slice(0, 100); // Максимум 100 карточек
}

// Хеширование контента для кеширования
function hashContent(text: string, cardCount: number): string {
  return createHash('md5')
    .update(`${text}:${cardCount}`)
    .digest('hex');
}

// Основная функция API
export default async function handler(req: Request): Promise<Response> {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body: FlashCardRequest = await req.json();
    const { text, cardCount = 20, userId } = body;

    // Валидация входных данных
    if (!text || text.trim().length < 10) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Text is required and must be at least 10 characters' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (cardCount > 100) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Maximum 100 cards allowed' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Подключение к Redis для кеширования
    let redis: Redis | null = null;
    const cacheKey = `strict_cards:${hashContent(text, cardCount)}`;
    
    try {
      if (process.env.REDIS_URL) {
        redis = new Redis(process.env.REDIS_URL);
        
        // Проверка кеша
        const cached = await redis.get(cacheKey);
        if (cached) {
          const cachedData = JSON.parse(cached);
          return new Response(
            JSON.stringify({ ...cachedData, cached: true }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    } catch (cacheError) {
      console.warn('Redis cache unavailable:', cacheError);
    }

    // Инициализация Claude API
    const claude = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    });

    // Запрос к Claude API
    const response = await claude.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4000,
      messages: [{
        role: "user",
        content: STRICT_EXTRACTION_PROMPT
          .replace('{cardCount}', cardCount.toString())
          .replace('{text}', text.slice(0, 50000)) // Лимит токенов
      }]
    });

    // Парсинг ответа Claude
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response format from Claude');
    }

    let cards: ExtractedFlashCard[];
    try {
      // Извлечение JSON из ответа (может быть в markdown блоке)
      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in Claude response');
      }
      
      const rawCards = JSON.parse(jsonMatch[0]);
      cards = validateCards(rawCards);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      throw new Error('Failed to parse Claude response as JSON');
    }

    if (cards.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No valid flashcards could be extracted from the text' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result: FlashCardResponse = {
      success: true,
      flashcards: cards,
      count: cards.length
    };

    // Кеширование результата на 24 часа
    if (redis) {
      try {
        await redis.setex(cacheKey, 86400, JSON.stringify(result));
      } catch (cacheError) {
        console.warn('Failed to cache result:', cacheError);
      } finally {
        await redis.quit();
      }
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Strict extraction error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to extract flashcards from text',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}