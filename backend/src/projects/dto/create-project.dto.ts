import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
