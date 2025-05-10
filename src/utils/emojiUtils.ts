/**
 * Generates an appropriate emoji for a class based on its title
 * @param classTitle The title of the class
 * @returns An appropriate emoji
 */
export const getEmojiForClass = (classTitle: string): string => {
  const title = classTitle.toLowerCase();

  // STEM subjects
  if (title.includes('math') || title.includes('calculus') || title.includes('algebra') || title.includes('geometry')) {
    return '🧮';
  }
  if (title.includes('computer') || title.includes('programming') || title.includes('code') || title.includes('software')) {
    return '💻';
  }
  if (title.includes('physics') || title.includes('astronomy') || title.includes('space')) {
    return '🔭';
  }
  if (title.includes('chemistry') || title.includes('organic')) {
    return '🧪';
  }
  if (title.includes('biology') || title.includes('life science')) {
    return '🧬';
  }
  if (title.includes('engineering') || title.includes('mechanical')) {
    return '⚙️';
  }
  if (title.includes('statistics') || title.includes('data science')) {
    return '📊';

  // Humanities
  } else if (title.includes('history') || title.includes('ancient') || title.includes('medieval')) {
    return '📜';
  } else if (title.includes('literature') || title.includes('english') || title.includes('writing')) {
    return '📚';
  } else if (title.includes('philosophy') || title.includes('ethics')) {
    return '🧠';
  } else if (title.includes('psychology') || title.includes('behavior')) {
    return '🧠';
  } else if (title.includes('sociology') || title.includes('cultural')) {
    return '👥';

  // Languages
  } else if (title.includes('spanish') || title.includes('español')) {
    return '🇪🇸';
  } else if (title.includes('french') || title.includes('français')) {
    return '🇫🇷';
  } else if (title.includes('german') || title.includes('deutsch')) {
    return '🇩🇪';
  } else if (title.includes('chinese') || title.includes('mandarin')) {
    return '🇨🇳';
  } else if (title.includes('japanese') || title.includes('nihongo')) {
    return '🇯🇵';

  // Business & Economics
  } else if (title.includes('economics') || title.includes('econ')) {
    return '📈';
  } else if (title.includes('business') || title.includes('management')) {
    return '💼';
  } else if (title.includes('marketing') || title.includes('advertis')) {
    return '📣';
  } else if (title.includes('finance') || title.includes('accounting')) {
    return '💰';

  // Arts
  } else if (title.includes('art') || title.includes('painting') || title.includes('drawing')) {
    return '🎨';
  } else if (title.includes('music') || title.includes('instrument')) {
    return '🎵';
  } else if (title.includes('theater') || title.includes('drama')) {
    return '🎭';
  } else if (title.includes('film') || title.includes('cinema')) {
    return '🎬';
  } else if (title.includes('photography')) {
    return '📷';

  // Sciences
  } else if (title.includes('medicine') || title.includes('medical') || title.includes('health')) {
    return '⚕️';
  } else if (title.includes('earth') || title.includes('geography') || title.includes('geology')) {
    return '🌎';
  } else if (title.includes('environment') || title.includes('ecology')) {
    return '🌱';

  // Other common subjects
  } else if (title.includes('law') || title.includes('legal')) {
    return '⚖️';
  } else if (title.includes('physical') || title.includes('gym') || title.includes('sport')) {
    return '🏃';
  } else if (title.includes('nutrition') || title.includes('food')) {
    return '🍎';
  } else if (title.includes('religion') || title.includes('theology')) {
    return '🙏';
  }

  // Default educational emoji if no specific match
  const defaultEmojis = ['📚', '📝', '✏️', '🎓', '🧠', '📊', '📈', '🔬', '📓', '🔍'];
  return defaultEmojis[Math.floor(Math.random() * defaultEmojis.length)];
};
