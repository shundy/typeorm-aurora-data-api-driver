import { ColumnMetadata } from 'typeorm/metadata/ColumnMetadata'
import { dateToDateString, dateToTimeString, dateToDateTimeString, simpleArrayToString, stringToSimpleArray, getDecimalCast } from '../utils/transform.utils'
import { QueryTransformer } from './query-transformer'

export class PostgresQueryTransformer extends QueryTransformer {
  public preparePersistentValue(value:any, metadata: ColumnMetadata): any {
    if (!value) {
      return value
    }

    // 配列型の処理
    if (metadata.isArray && Array.isArray(value)) {
      // PostgreSQL配列形式に変換
      return this.stringifyArrayForPostgres(value, metadata.type)
    }

    switch (metadata.type) {
      case 'date':
        return {
          value: dateToDateString(value),
          cast: 'DATE',
        }
      case 'time':
        return {
          value: dateToTimeString(value),
          cast: 'TIME',
        }
      case 'time with time zone':
        return {
          value: dateToTimeString(value),
          cast: 'time with time zone',
        }
      case 'timetz':
        return {
          value: dateToTimeString(value),
          cast: 'timetz',
        }
      case 'interval':
        return {
          value,
          cast: 'interval',
        }
      case 'timestamp':
      case 'datetime':
      case 'timestamp with time zone':
      case 'timestamptz':
        return {
          value: dateToDateTimeString(value),
          cast: 'TIMESTAMP',
        }
      case 'decimal':
      case 'numeric':
        return {
          value: '' + value,
          cast: getDecimalCast(metadata),
        }
      case 'simple-array':
        return {
          value: simpleArrayToString(value),
        }
      case 'simple-json':
      case 'json':
      case 'jsonb':
        return {
          value: JSON.stringify(value),
          cast: 'JSON',
        }
      case 'uuid':
        return {
          value: '' + value,
          cast: 'UUID',
        }
      case 'simple-enum':
      case 'enum':
        return {
          value: '' + value,
          cast: metadata.enumName || `${metadata.entityMetadata.schema ? `${metadata.entityMetadata.schema}.` : ''}${metadata.entityMetadata.tableName}_${metadata.databaseName.toLowerCase()}_enum`,
        }
      default:
        return {
          value,
        }
    }
  }

  // JavaScript配列をPostgreSQL配列文字列に変換するヘルパーメソッド
  private stringifyArrayForPostgres(value: any[], type: string): string {
    if (value.length === 0) return '{}'

    const items = value.map(item => {
      if (item === null) return 'NULL'

      switch (type) {
        case 'varchar':
        case 'character varying':
        case 'text':
          // 文字列は引用符でエスケープ
          return `"${String(item).replace(/"/g, '\\"')}"`
        default:
          return String(item)
      }
    })

    return `{${items.join(',')}}`
  }

  prepareHydratedValue(value: any, metadata: ColumnMetadata): any {
    if (value === null || value === undefined) {
      return value
    }

    switch (metadata.type) {
      case Boolean:
        return !!value
      case 'datetime':
      case Date:
      case 'timestamp':
      case 'timestamp with time zone':
      case 'timestamp without time zone':
      case 'timestamptz':
        return typeof value === 'string' ? new Date(value + ' GMT+0') : value
      case 'date':
        return dateToDateString(value)
      case 'time':
        return value
      case 'hstore':
        if (metadata.hstoreType === 'object') {
          const unescapeString = (str: string) => str.replace(/\\./g, (m) => m[1])
          const regexp = /"([^"\\]*(?:\\.[^"\\]*)*)"=>(?:(NULL)|"([^"\\]*(?:\\.[^"\\]*)*)")(?:,|$)/g
          const object: any = {};
          `${value}`.replace(regexp, (_, key, nullValue, stringValue) => {
            object[unescapeString(key)] = nullValue ? null : unescapeString(stringValue)
            return ''
          })
          return object
        }
        return value
      case 'simple-array':
        return typeof value === 'string' ? stringToSimpleArray(value) : value
      case 'json':
      case 'simple-json':
      case 'jsonb':
        return typeof value === 'string' ? JSON.parse(value) : value
      case 'enum':
      case 'simple-enum':
        if (metadata.isArray) {
          // manually convert enum array to array of values (pg does not support, see https://github.com/brianc/node-pg-types/issues/56)
          value = value !== '{}' ? (value as string).substr(1, (value as string).length - 2)
            .split(',') : []
          // convert to number if that exists in possible enum options
          return value.map((val: string) => (!Number.isNaN(+val) && metadata.enum!.indexOf(parseInt(val, 10)) >= 0 ? parseInt(val, 10) : val))
        }
        // convert to number if that exists in poosible enum options
        return !Number.isNaN(+value) && metadata.enum!.indexOf(parseInt(value, 10)) >= 0 ? parseInt(value, 10) : value
      // PostgreSQL配列型の処理を追加
      case 'int':
      case 'int2':
      case 'int4':
      case 'int8':
      case 'integer':
      case 'smallint':
      case 'bigint':
        if (metadata.isArray && typeof value === 'string') {
          // '{1,2,3}' 形式の文字列を配列に変換
          return this.parsePostgresArray(value, (val) => parseInt(val, 10))
        }
        return value

      case 'decimal':
      case 'numeric':
      case 'real':
      case 'float':
      case 'float4':
      case 'float8':
      case 'double precision':
        if (metadata.isArray && typeof value === 'string') {
          return this.parsePostgresArray(value, (val) => parseFloat(val))
        }
        return value

      case 'varchar':
      case 'character varying':
      case 'text':
        if (metadata.isArray && typeof value === 'string') {
          return this.parsePostgresArray(value, (val) => val)
        }
        return value

      case 'boolean':
        if (metadata.isArray && typeof value === 'string') {
          return this.parsePostgresArray(value, (val) => val === 'true' || val === 't')
        }
        return value

      default:
        if (metadata.isArray && typeof value === 'string') {
          return this.parsePostgresArray(value)
        }
        return value
    }
  }

  protected transformQuery(query: string) {
    const quoteCharacters = ["'", '"']
    let newQueryString = ''
    let currentQuote = null

    for (let i = 0; i < query.length; i += 1) {
      const currentCharacter = query[i]
      const currentCharacterEscaped = i !== 0 && query[i - 1] === '\\'

      if (currentCharacter === '$' && !currentQuote) {
        newQueryString += ':param_'
      } else {
        newQueryString += currentCharacter

        if (quoteCharacters.includes(currentCharacter) && !currentCharacterEscaped) {
          if (!currentQuote) {
            currentQuote = currentCharacter
          } else if (currentQuote === currentCharacter) {
            currentQuote = null
          }
        }
      }
    }

    return newQueryString
  }

  protected transformParameters(parameters?: any[]) {
    if (!parameters) {
      return parameters
    }

    return parameters.map((parameter, index) => {
      if (parameter === undefined) {
        return parameter
      }

      if (typeof parameter === 'object' && typeof parameter?.value !== 'undefined') {
        return ({
          name: `param_${index + 1}`,
          ...parameter,
        })
      }

      // Hack for UUID
      if (this.transformOptions?.enableUuidHack && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test('' + parameter)) {
        return {
          name: `param_${index + 1}`,
          value: '' + parameter,
          cast: 'uuid',
        }
      }

      return {
        name: `param_${index + 1}`,
        value: parameter,
      }
    })
  }

  // PostgreSQL配列文字列をJavaScript配列に変換するヘルパーメソッド
  private parsePostgresArray(value: string, itemConverter: (item: string) => any = (item) => item): any[] {
    if (value === '{}') return []

    // '{item1,item2,...}' 形式の文字列から中身を取り出す
    const content = value.substring(1, value.length - 1)

    // カンマで分割して配列に変換
    if (content.length === 0) return []

    return content.split(',')
      .map((item) => {
        // NULL値の処理
        if (item === 'NULL') return null

        // 引用符で囲まれた文字列の処理
        if (item.startsWith('"') && item.endsWith('"')) {
          return itemConverter(item.substring(1, item.length - 1).replace(/\\"/g, '"'))
        }

        return itemConverter(item)
      })
  }
}
