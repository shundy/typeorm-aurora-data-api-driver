import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity()
export class ArrayEntity {
  @PrimaryGeneratedColumn()
    id!: number

  @Column('int', { array: true, nullable: true })
    intArray!: number[] | null

  @Column('text', { array: true, nullable: true })
    textArray!: string[] | null

  @Column('boolean', { array: true, nullable: true })
    booleanArray!: boolean[] | null
}
