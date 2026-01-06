import axios from 'axios';

/**
 * Web Search Service
 * Supports multiple search providers: Tavily (recommended for AI), Serper, and Brave
 */

const SEARCH_PROVIDERS = {
  TAVILY: 'tavily',
  SERPER: 'serper',
  BRAVE: 'brave'
};

const TAVILY_API_URL = 'https://api.tavily.com/search';
const SERPER_API_URL = 'https://google.serper.dev/search';
const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';

/**
 * Perform a web search using the configured provider
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Object>} - Search results
 */
export async function performWebSearch(query, options = {}) {
  const provider = options.provider || SEARCH_PROVIDERS.TAVILY;
  const maxResults = options.maxResults || 5;

  try {
    switch (provider) {
      case SEARCH_PROVIDERS.TAVILY:
        return await searchWithTavily(query, maxResults, options);
      case SEARCH_PROVIDERS.SERPER:
        return await searchWithSerper(query, maxResults, options);
      case SEARCH_PROVIDERS.BRAVE:
        return await searchWithBrave(query, maxResults, options);
      default:
        throw new Error(`Unknown search provider: ${provider}`);
    }
  } catch (error) {
    console.error('Web search error:', error);
    throw new Error(`Search failed: ${error.message}`);
  }
}

/**
 * Search using Tavily API (optimized for AI agents)
 */
async function searchWithTavily(query, maxResults, options) {
  const apiKey = process.env.REACT_APP_TAVILY_API_KEY;

  if (!apiKey) {
    console.warn('Tavily API key not configured, search unavailable');
    return { results: [], error: 'Search API not configured' };
  }

  try {
    const response = await axios.post(
      TAVILY_API_URL,
      {
        api_key: apiKey,
        query: query,
        search_depth: options.deep ? 'advanced' : 'basic',
        max_results: maxResults,
        include_answer: true,
        include_raw_content: false,
        include_images: false
      }
    );

    return {
      query: query,
      results: response.data.results.map(r => ({
        title: r.title,
        url: r.url,
        snippet: r.content,
        score: r.score
      })),
      answer: response.data.answer,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Tavily search error:', error);
    return { results: [], error: error.message };
  }
}

/**
 * Search using Serper API (Google Search)
 */
async function searchWithSerper(query, maxResults, options) {
  const apiKey = process.env.REACT_APP_SERPER_API_KEY;

  if (!apiKey) {
    console.warn('Serper API key not configured, search unavailable');
    return { results: [], error: 'Search API not configured' };
  }

  try {
    const response = await axios.post(
      SERPER_API_URL,
      {
        q: query,
        num: maxResults,
        gl: options.country || 'ca', // Default to Canada for Edmonton
        hl: options.language || 'en'
      },
      {
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    const organic = response.data.organic || [];

    return {
      query: query,
      results: organic.slice(0, maxResults).map(r => ({
        title: r.title,
        url: r.link,
        snippet: r.snippet,
        position: r.position
      })),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Serper search error:', error);
    return { results: [], error: error.message };
  }
}

/**
 * Search using Brave Search API
 */
async function searchWithBrave(query, maxResults, options) {
  const apiKey = process.env.REACT_APP_BRAVE_API_KEY;

  if (!apiKey) {
    console.warn('Brave API key not configured, search unavailable');
    return { results: [], error: 'Search API not configured' };
  }

  try {
    const params = new URLSearchParams({
      q: query,
      count: maxResults,
      country: options.country || 'CA',
      search_lang: options.language || 'en'
    });

    const response = await axios.get(`${BRAVE_API_URL}?${params}`, {
      headers: {
        'X-Subscription-Token': apiKey,
        'Accept': 'application/json'
      }
    });

    const web = response.data.web?.results || [];

    return {
      query: query,
      results: web.slice(0, maxResults).map(r => ({
        title: r.title,
        url: r.url,
        snippet: r.description
      })),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Brave search error:', error);
    return { results: [], error: error.message };
  }
}

/**
 * Format search results for agent consumption
 * @param {Object} searchResults - Results from performWebSearch
 * @returns {string} - Formatted text for Claude
 */
export function formatSearchResultsForAgent(searchResults) {
  if (!searchResults.results || searchResults.results.length === 0) {
    return 'No search results found.';
  }

  let formatted = `Search Results for: "${searchResults.query}"\n`;
  formatted += `Found ${searchResults.results.length} results\n\n`;

  if (searchResults.answer) {
    formatted += `Quick Answer: ${searchResults.answer}\n\n`;
  }

  searchResults.results.forEach((result, index) => {
    formatted += `[${index + 1}] ${result.title}\n`;
    formatted += `    ${result.snippet}\n`;
    formatted += `    Source: ${result.url}\n\n`;
  });

  return formatted;
}

/**
 * Search for location-specific information
 * @param {string} query - Search query
 * @param {string} location - Location (e.g., "Edmonton, AB")
 * @returns {Promise<Object>} - Search results
 */
export async function searchByLocation(query, location) {
  const locationQuery = `${query} in ${location}`;
  return await performWebSearch(locationQuery, {
    provider: SEARCH_PROVIDERS.TAVILY,
    maxResults: 5
  });
}

/**
 * Search for current market data
 * @param {string} industry - Industry or market sector
 * @param {string} location - Location
 * @returns {Promise<Object>} - Search results
 */
export async function searchMarketData(industry, location) {
  const queries = [
    `${industry} market size ${location} 2025`,
    `${industry} trends ${location} current`,
    `${industry} statistics ${location}`
  ];

  const results = await Promise.all(
    queries.map(q => performWebSearch(q, { maxResults: 3 }))
  );

  return {
    query: `Market data for ${industry} in ${location}`,
    combinedResults: results.flatMap(r => r.results || []),
    timestamp: new Date().toISOString()
  };
}

/**
 * Check if web search is available
 * @returns {boolean}
 */
export function isSearchAvailable() {
  return !!(
    process.env.REACT_APP_TAVILY_API_KEY ||
    process.env.REACT_APP_SERPER_API_KEY ||
    process.env.REACT_APP_BRAVE_API_KEY
  );
}
