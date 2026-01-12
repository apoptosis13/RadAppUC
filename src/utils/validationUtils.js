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

