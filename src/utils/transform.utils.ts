import { ColumnMetadata } from 'typeorm/metadata/ColumnMetadata'

const pad = (val: string | number, num = 2) => '0'.repeat(num - (val.toString()).length) + val

export const dateToDateTimeString = (date: Date) => {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + 1 // Convert to human month
  const day = date.getUTCDate()

  const hours = date.getUTCHours()
  const minutes = date.getUTCMinutes()
  const seconds = date.getUTCSeconds()
  const ms = date.getUTCMilliseconds()

  const fraction = ms <= 0 ? '' : `.${pad(ms, 3)}`

  return `${year}-${pad(month)}-${pad(day)} ${pad(hours)}:${pad(minutes)}:${pad(seconds)}${fraction}`
}

export const dateToDateString = (date: Date | string) => {
  if (typeof date === 'string') {
    return date
  }

  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + 1 // Convert to human month
  const day = date.getUTCDate()

  return `${year}-${pad(month)}-${pad(day)}`
}

export const dateToTimeString = (date: Date | string) => {
  if (typeof date === 'string') {
    return date
  }

  const hours = date.getUTCHours()
  const minutes = date.getUTCMinutes()
  const seconds = date.getUTCSeconds()
  const ms = date.getUTCMilliseconds()

  const fraction = ms <= 0 ? '' : `.${pad(ms, 3)}`

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}${fraction}`
}

export const simpleArrayToString = (value: any[]|any): string[]|any => {
  if (Array.isArray(value)) {
    return (value as any[])
      .map((i) => String(i))
      .join(',')
  }

  return value
}

export const stringToSimpleArray = (value: string|any): any[] => {
  if (value instanceof String || typeof value === 'string') {
    if (value.length > 0) {
      return value.split(',')
    }
    return []
  }

  return value
}

export const getDecimalCast = ({ precision, scale }: Pick<ColumnMetadata, 'scale' | 'precision'>): string => {
  if (!precision) return 'DECIMAL'

  if (!scale) return `DECIMAL(${precision})`

  return `DECIMAL(${precision},${scale})`
}


// PostgreSQL配列の文字列表現に変換
export const arrayToPostgresArray = (value: any[]): string => {
  if (!Array.isArray(value)) {
    return value;
  }

  // 要素を適切にエスケープして文字列化
  const elements = value.map((item) => {
    if (item === null) return 'NULL';
    if (typeof item === 'string') {
      // 文字列の場合は二重引用符でエスケープ
      return `"${item.replace(/"/g, '""')}"`;
    }
    return String(item);
  });

  return `{${elements.join(',')}}`;
};

// PostgreSQL配列文字列を配列に変換
export const postgresArrayToArray = (value: string): any[] => {
  if (typeof value !== 'string' || !value.startsWith('{') || !value.endsWith('}')) {
    return value as unknown as any[];
  }

  // 中括弧を取り除き、要素を解析
  const content = value.substring(1, value.length - 1);
  if (content.length === 0) return [];

  // 単純な分割では不十分なため、引用符を考慮した解析が必要
  const result = [];
  let currentStr = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (char === '"' && (i === 0 || content[i - 1] !== '\\')) {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(parsePostgresArrayElement(currentStr));
      currentStr = '';
    } else {
      currentStr += char;
    }
  }

  if (currentStr.length > 0) {
    result.push(parsePostgresArrayElement(currentStr));
  }

  return result;
};

// PostgreSQL配列要素を適切な型に変換
function parsePostgresArrayElement(element: string): any {
  if (element === 'NULL') return null;
  if (element.startsWith('"') && element.endsWith('"')) {
    return element.substring(1, element.length - 1).replace(/""/g, '"');
  }
  if (!isNaN(Number(element))) {
    return Number(element);
  }
  return element;
}
