import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
    constructor(private readonly searchService: SearchService) { }

    @Get()
    search(
        @Query('tipo') tipo?: string,
        @Query('minPrecio') minPrecio?: number,
        @Query('maxPrecio') maxPrecio?: number,
        @Query('dormitorios') dormitorios?: number,
        @Query('banos') banos?: number,
        @Query('estacionamiento') estacionamiento?: boolean,
        @Query('patio') patio?: boolean,
        @Query('piscina') piscina?: boolean,
        @Query('q') q?: string,
        @Query('minLat') minLat?: number,
        @Query('maxLat') maxLat?: number,
        @Query('minLng') minLng?: number,
        @Query('maxLng') maxLng?: number,
        @Query('mascotas') mascotas?: boolean,
        @Query('tipoVivienda') tipoVivienda?: string,
        @Query('terrenoMin') terrenoMin?: number,
        @Query('terrenoMax') terrenoMax?: number,
        @Query('construccionMin') construccionMin?: number,
        @Query('construccionMax') construccionMax?: number,
    ) {
        return this.searchService.search({
            tipo, minPrecio, maxPrecio, dormitorios, banos,
            estacionamiento, patio, piscina, q,
            minLat, maxLat, minLng, maxLng,
            mascotas, tipoVivienda, terrenoMin, terrenoMax, construccionMin, construccionMax
        });
    }
}
