import { Module } from "@nestjs/common";
import { ThemesController } from "./themes.controller";
import { ThemesService } from "./themes.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [ThemesController],
  providers: [ThemesService],
})
export class ThemesModule {}
