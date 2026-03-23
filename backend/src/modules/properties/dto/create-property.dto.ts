import {
  IsString,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { PropertyType } from '@prisma/client';

export class CreatePropertyDto {
  @IsString()
  matricula: string;

  @IsString()
  @MaxLength(1000)
  descripcion: string;

  @IsString()
  ubicacion: string;

  @IsEnum(PropertyType)
  tipo: PropertyType;

  @IsNumber()
  precio: number;

  @IsNumber()
  dormitorios: number;

  @IsNumber()
  banos: number;

  @IsBoolean()
  estacionamiento: boolean;

  @IsBoolean()
  patio: boolean;

  @IsBoolean()
  piscina: boolean;

  @IsOptional()
  @IsBoolean()
  mascotas?: boolean;

  @IsOptional()
  @IsString()
  tipoVivienda?: string;

  @IsOptional()
  @IsNumber()
  terreno?: number;

  @IsOptional()
  @IsNumber()
  construccion?: number;

  @IsOptional()
  @IsNumber()
  tiempoAlquiler?: number;

  @IsOptional()
  @IsNumber()
  tiempoAnticretico?: number;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString({ each: true })
  images?: string[];
}
