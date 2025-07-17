// src/features/calendar/types.ts
import { ClassConfig } from '@/services/classOpenAIConfig';

export interface ClassConfigWithColor extends ClassConfig {
    color: string;
}