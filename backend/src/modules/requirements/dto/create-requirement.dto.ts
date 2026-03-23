import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsInt,
  IsArray,
  Min,
} from 'class-validator';
import { PropertyType } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateRequirementDto {
  @IsString()
  description: string;

  @IsEnum(PropertyType)
  @IsOptional()
  propertyType?: PropertyType;

  @IsString()
  @IsOptional()
  tipoVivienda?: string;

  @IsString()
  @IsOptional()
  ubicacion?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minBudget?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  maxBudget?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  dormitorios?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  banos?: number;

  @IsBoolean()
  @IsOptional()
  estacionamiento?: boolean;

  @IsBoolean()
  @IsOptional()
  patio?: boolean;

  @IsBoolean()
  @IsOptional()
  piscina?: boolean;

  @IsBoolean()
  @IsOptional()
  mascotas?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  terreno?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  construccion?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  tiempoAlquiler?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  tiempoAnticretico?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
