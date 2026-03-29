import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DataModule } from './data/data.module';
import { PrismaModule } from './prisma/prisma.module';
import { WorkshopModule } from './workshop/workshop.module';

@Module({
  imports: [PrismaModule, AuthModule, WorkshopModule, DataModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
