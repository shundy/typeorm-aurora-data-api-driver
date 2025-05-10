import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity()
export class ArrayEntity {
  @PrimaryGeneratedColumn()
    id!: number

  @Column('simple-array', { nullable: true })
    array!: string[] | null

  @Column('int', { array: true, nullable: true })
    numberArray!: number[] | null

  @Column('text', { array: true, nullable: true })
    textArray!: string[] | null

  @Column('varchar', { array: true, length: 50, nullable: true })
    varcharArray!: string[] | null

  @Column('float', { array: true, nullable: true })
    floatArray!: number[] | null

  @Column('boolean', { array: true, nullable: true })
    booleanArray!: boolean[] | null

  // @Column('timestamp', { array: true, nullable: true })
  //   timestampArray!: Date[] | null

  @Column('json', { array: true, nullable: true })
    jsonArray!: object[] | null
}
