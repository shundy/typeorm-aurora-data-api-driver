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

// PostgreSQL配列文字列をJavaScript配列に変換
export const postgresArrayToArray = (value: string, itemConverter?: (item: string) => any): any[] => {
  if (typeof value !== 'string' || value === '{}') return []

  // '{item1,item2,...}' 形式の文字列から中身を取り出す
  const content = value.substring(1, value.length - 1)

  // カンマで分割して配列に変換
  if (content.length === 0) return []

  return content.split(',')
    .map(item => {
      // NULL値の処理
      if (item === 'NULL') return null

      // 引用符で囲まれた文字列の処理
      if (item.startsWith('"') && item.endsWith('"')) {
        const unquoted = item.substring(1, item.length - 1).replace(/\\"/g, '"')
        return itemConverter ? itemConverter(unquoted) : unquoted
      }

      return itemConverter ? itemConverter(item) : item
    })
}

// JavaScript配列をPostgreSQL配列文字列に変換
export const arrayToPostgresArray = (value: any[], escapeStrings: boolean = true): string => {
  if (!Array.isArray(value)) return value

  if (value.length === 0) return '{}'

  const items = value.map(item => {
    if (item === null) return 'NULL'

    if (typeof item === 'string' && escapeStrings) {
      // 文字列は引用符でエスケープ
      return `"${item.replace(/"/g, '\\"')}"`
    }

    return String(item)
  })

  return `{${items.join(',')}}`
}