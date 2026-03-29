import { Module } from '@nestjs/common';
import { WorkshopController } from './workshop.controller';
import { WorkshopService } from './workshop.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [WorkshopController],
  providers: [WorkshopService],
})
export class WorkshopModule {}
