import { ServerStructure } from '../../domain/server-structure.interface';

export interface ServerTemplate {
  build(): ServerStructure;
}