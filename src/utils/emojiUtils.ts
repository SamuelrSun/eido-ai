
/**
 * Maps class titles to relevant emojis based on keywords
 */
const subjectEmojiMap: Record<string, string> = {
  // Sciences
  'physics': '⚛️',
  'chemistry': '🧪',
  'biology': '🧬',
  'astronomy': '🔭',
  'math': '🧮',
  'mathematics': '🧮',
  'statistics': '📊',
  'calculus': '📈',
  'algebra': '🔢',
  'geometry': '📐',
  'science': '🔬',
  
  // Humanities
  'literature': '📚',
  'english': '📝',
  'history': '🏛️',
  'philosophy': '🧠',
  'art': '🎨',
  'music': '🎵',
  'language': '🗣️',
  'spanish': '🇪🇸',
  'french': '🇫🇷',
  'german': '🇩🇪',
  'chinese': '🇨🇳',
  'japanese': '🇯🇵',
  
  // Technology and Computer
  'computer': '💻',
  'programming': '👨‍💻',
  'code': '💻',
  'software': '👨‍💻',
  'web': '🌐',
  'data': '📊',
  'database': '🗄️',
  'engineering': '⚙️',
  'robotics': '🤖',
  'artificial intelligence': '🤖',
  'ai': '🤖',
  'technology': '📱',
  
  // Business and Economics
  'business': '💼',
  'economics': '📈',
  'finance': '💰',
  'accounting': '🧮',
  'marketing': '📢',
  'management': '👔',
  
  // Social Sciences
  'psychology': '🧠',
  'sociology': '👥',
  'anthropology': '🏺',
  'political': '🏛️',
  'politics': '🏛️',
  'geography': '🌍',
  
  // Health and Medicine
  'health': '❤️',
  'medicine': '💊',
  'nursing': '🩺',
  'anatomy': '🦴',
  'physiology': '🫀',
  'nutrition': '🥗',
  
  // Physical Education
  'physical': '🏃',
  'sport': '⚽',
  'fitness': '💪',
  'dance': '💃',
  'yoga': '🧘',
  
  // Miscellaneous
  'writing': '✍️',
  'communication': '🗣️',
  'research': '🔎',
  'design': '✏️',
  'journalism': '📰',
  'media': '📱',
  'photography': '📷',
  'religion': '🙏',
  'ethics': '⚖️',
  'law': '⚖️',
  'environment': '🌱',
  'ecology': '🌿',
  'theater': '🎭',
  'drama': '🎭',
  'film': '🎬',
  'cinema': '🎬'
};

// Default emojis to use if no match is found
const defaultEmojis = ['📚', '🎓', '✏️', '📝', '💡', '🧠', '🎯', '📊', '🔍', '📋'];

/**
 * Get a relevant emoji for a class title
 * @param title The class title
 * @returns An emoji that matches the class subject
 */
export function getEmojiForClass(title: string): string {
  if (!title) return '📚'; // Default emoji
  
  const lowercaseTitle = title.toLowerCase();
  
  // Check for keyword matches in the title
  for (const [keyword, emoji] of Object.entries(subjectEmojiMap)) {
    if (lowercaseTitle.includes(keyword.toLowerCase())) {
      return emoji;
    }
  }
  
  // If no match found, use a default emoji based on the first character of the title
  // This ensures consistency for the same class title
  const charCode = title.charCodeAt(0);
  const index = charCode % defaultEmojis.length;
  return defaultEmojis[index];
}
