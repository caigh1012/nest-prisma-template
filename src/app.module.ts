import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { SharedModule } from './modules/shared/shared.module';
import { UsersModule } from './modules/users/users.module';

/**
 * 应用模块
 * 1. 引入配置模块
 * 2. 引入共享模块
 * 3. 引入用户模块
 */
@Module({
  imports: [
    // 引入 env 文件配置
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // pino 日志：仅生产环境按天滚动（文件名带日期），单个文件超过 10MB 自动创建新文件
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        pinoHttp:
          configService.get('NODE_ENV') === 'production'
            ? {
                transport: {
                  target: 'pino-roll',
                  options: {
                    file: './logs/app', // 生成 ./logs/app.YYYY-MM-DD.N.log
                    frequency: 'daily', // 每天滚动
                    dateFormat: 'yyyy-MM-dd', // 文件名带上日期（pino-roll 4.x 需显式指定）
                    size: '10m', // 超过 10MB 滚动
                    mkdir: true, // 自动创建 ./logs 目录
                  },
                },
              }
            : { enabled: false },
      }),
    }),
    SharedModule,
    UsersModule,
  ],
  providers: [],
})
export class AppModule {}
