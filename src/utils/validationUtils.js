/**
 * Normalizes a string by removing accents, converting to lowercase, and trimming.
 * @param {string} str 
 * @returns {string}
 */
export const normalizeString = (str) => {
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
};

/**
 * Tokenizes a string, removing stop words.
 * @param {string} str 
 * @returns {string[]}
 */
const tokenize = (str) => {
    const stopWords = ['de', 'del', 'el', 'la', 'los', 'las', 'en', 'un', 'una', 'y', 'o', 'con', 'sin', 'por', 'para'];

    // Anatomical synonyms map
    const synonyms = {
        'interno': 'medial',
        'externo': 'lateral'
    };

    let normalized = normalizeString(str);

    // Replace synonyms
    Object.keys(synonyms).forEach(key => {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        normalized = normalized.replace(regex, synonyms[key]);
    });

    return normalized
        .split(/\s+/)
        .filter(word => word.length > 0 && !stopWords.includes(word));
};

/**
 * Checks if the user diagnosis matches any of the accepted aliases using token overlap.
 * @param {string} userDiagnosis 
 * @param {string[]} aliases 
 * @returns {boolean}
 */
export const validateDiagnosis = (userDiagnosis, aliases = []) => {
    if (!userDiagnosis) return false;
    const userTokens = tokenize(userDiagnosis);

    if (userTokens.length === 0) return false;

    return aliases.some(alias => {
        const aliasTokens = tokenize(alias);

        // Check if all user tokens are present in the alias tokens (or vice versa)
        // This allows for "Desgarro menisco" to match "Desgarro del menisco medial" (partial match)
        // But we want to be careful not to be too loose.

        // Strategy: Calculate intersection
        const intersection = userTokens.filter(token => aliasTokens.includes(token));

        // If user provides a subset of the correct diagnosis (e.g. "menisco medial" for "desgarro menisco medial"), 
        // it might be too vague. But "desgarro menisco" for "desgarro menisco medial" is okay.

        // Let's require that a significant portion of the tokens match.
        // If user input is short (1-2 words), require exact token match (order independent).
        // If user input is long, allow some missing words?

        // Simplified "Smart" Logic:
        // 1. If user tokens are a subset of alias tokens AND cover at least 50% of alias tokens.
        // 2. OR if alias tokens are a subset of user tokens (user was more verbose).

        const matchCount = intersection.length;
        const userRatio = matchCount / userTokens.length;
        const aliasRatio = matchCount / aliasTokens.length;

        // User input must be relevant (mostly contained in alias)
        if (userRatio < 0.8) return false; // Allow 20% typo/extra words

        // And must cover enough of the concept
        if (aliasRatio > 0.5) return true;

        return false;
    });
};

/**
 * Checks for the presence of keywords in the user's findings.
 * If keywords are not provided, they are dynamically generated from expectedFindingsText.
 * @param {string} userFindings 
 * @param {string[]} keywords 
 * @param {string} expectedFindingsText 
 * @returns {object} { score: number, found: string[], missing: string[] }
 */
export const validateFindings = (userFindings, keywords = [], expectedFindingsText = '') => {
    if (!userFindings) return { score: 0, found: [], missing: [] };

    let targetKeywords = keywords;

    // If no explicit keywords, generate them from the expected text
    if ((!targetKeywords || targetKeywords.length === 0) && expectedFindingsText) {
        // Tokenize and filter for significant words (length > 3) to avoid noise
        targetKeywords = tokenize(expectedFindingsText).filter(word => word.length > 3);
        // Remove duplicates
        targetKeywords = [...new Set(targetKeywords)];
    }

    if (!targetKeywords || targetKeywords.length === 0) return { score: 0, found: [], missing: [] };

    const normalizedFindings = normalizeString(userFindings);
    const found = [];
    const missing = [];

    targetKeywords.forEach(keyword => {
        const normalizedKeyword = normalizeString(keyword);
        // Check for partial match (e.g. "menisc" in "menisco") if keyword is long enough
        if (normalizedFindings.includes(normalizedKeyword)) {
            found.push(keyword);
        } else {
            missing.push(keyword);
        }
    });

    const score = found.length / targetKeywords.length;
    return { score, found, missing };
};
