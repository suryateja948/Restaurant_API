import { Module } from '@nestjs/common';
import { GeocodingService } from './geocoding.service';
import { GeocodingController } from './geocoding.controller';

@Module({
  providers: [GeocodingService],
  controllers: [GeocodingController],
})
export class GeocodingModule {}
