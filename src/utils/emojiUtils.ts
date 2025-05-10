/**
 * Maps class titles to relevant emojis based on educational keywords
 */
const subjectEmojiMap: Record<string, string> = {
  // STEM Fields
  // Mathematics
  'math': '🧮',
  'mathematics': '🧮',
  'statistics': '📊',
  'calculus': '📈',
  'algebra': '🔢',
  'geometry': '📐',
  'trigonometry': '📏',
  'probability': '🎲',
  
  // Sciences
  'physics': '⚛️',
  'chemistry': '🧪',
  'biology': '🧬',
  'anatomy': '🦴',
  'physiology': '🫀',
  'astronomy': '🔭',
  'earth science': '🌏',
  'geology': '🪨',
  'science': '🔬',
  'lab': '🧪',
  'experiment': '⚗️',
  'microbiology': '🦠',
  'genetics': '🧬',
  'ecology': '🌿',
  
  // Computer & Technology
  'computer science': '💻',
  'programming': '👨‍💻',
  'code': '💻',
  'software': '👨‍💻',
  'web': '🌐',
  'data': '📊',
  'database': '🗄️',
  'algorithm': '🧠',
  'engineering': '⚙️',
  'robotics': '🤖',
  'artificial intelligence': '🤖',
  'ai': '🤖',
  'machine learning': '🧠',
  'cybersecurity': '🔒',
  'networking': '🔌',
  'technology': '📱',
  
  // Humanities
  'literature': '📚',
  'english': '📝',
  'writing': '✍️',
  'poetry': '📜',
  'fiction': '📖',
  'reading': '📚',
  'history': '🏛️',
  'civilization': '🏺',
  'archaeology': '🏺',
  'philosophy': '🧠',
  'ethics': '⚖️',
  'art': '🎨',
  'music': '🎵',
  'theater': '🎭',
  'drama': '🎭',
  'film': '🎬',
  'cinema': '🎬',
  'dance': '💃',
  'classics': '🏛️',
  
  // Languages
  'language': '🗣️',
  'spanish': '🗣️',
  'french': '🗣️',
  'german': '🗣️',
  'chinese': '🗣️',
  'japanese': '🗣️',
  'latin': '🗣️',
  'russian': '🗣️',
  'arabic': '🗣️',
  'greek': '🗣️',
  'italian': '🗣️',
  'portuguese': '🗣️',
  'linguistics': '🔤',
  'speech': '🎤',
  'communication': '🗣️',
  
  // Business and Economics
  'business': '💼',
  'economics': '📈',
  'finance': '💰',
  'accounting': '🧮',
  'marketing': '📢',
  'management': '👔',
  'entrepreneurship': '💡',
  'commerce': '💹',
  'trade': '💱',
  'investment': '💲',
  'banking': '🏦',
  
  // Social Sciences
  'psychology': '🧠',
  'sociology': '👥',
  'anthropology': '🏺',
  'political': '🏛️',
  'politics': '🏛️',
  'government': '🏛️',
  'geography': '🌍',
  'urban studies': '🏙️',
  'law': '⚖️',
  'criminology': '🕵️',
  'international': '🌐',
  'social': '👥',
  
  // Health and Medicine
  'health': '❤️',
  'medicine': '💊',
  'nursing': '🩺',
  'pharmacy': '💊',
  'nutrition': '🥗',
  'kinesiology': '🏃',
  'physical therapy': '💆',
  'public health': '🏥',
  'medical': '🩺',
  'healthcare': '🏥',
  
  // Physical Education
  'physical': '🏃',
  'sport': '⚽',
  'fitness': '💪',
  'yoga': '🧘',
  'athletics': '🏅',
  'recreation': '🎯',
  'exercise': '🏋️',
  'training': '⛹️',
  'coaching': '📋',
  
  // Educational
  'education': '🎓',
  'teaching': '👨‍🏫',
  'learning': '📚',
  'study': '📖',
  'research': '🔎',
  'thesis': '📑',
  'dissertation': '📜',
  'academic': '🎓',
  'school': '🏫',
  'college': '🏛️',
  'university': '🏛️',
  'seminar': '👨‍🏫',
  'tutorial': '👩‍🏫',
  
  // Other Disciplines
  'journalism': '📰',
  'media': '📱',
  'photography': '📷',
  'design': '✏️',
  'architecture': '🏛️',
  'religion': '🙏',
  'theology': '📿',
  'agriculture': '🌱',
  'environment': '🌱',
  'sustainability': '♻️',
  'urban planning': '🏙️'
};

// Default emojis to use if no match is found - now educational-focused
const defaultEmojis = ['📚', '🎓', '✏️', '📝', '💡', '🧠', '🎯', '📊', '🔍', '📋', '💻', '⚗️'];

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
