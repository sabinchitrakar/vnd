import {
  IMoneyInput,
  IVendingInput,
  IVendingResult,
  MoneyType,
  VendingErrors,
} from '@vnd/common';
import * as request from 'supertest';
import { AppModule } from './../app/app.module';
import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Coke, Pepsi } from '../app/product/product.model';
import { newCash, newCoin } from '../app/money/money.model';
import { CounterService } from '../app/counter/counter.service';

describe('AppController (e2e)', () => {
  let app;
  let moduleFixture: TestingModule;

  beforeEach(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  it('{GET}/status', () => {
    return request(app.getHttpServer())
      .get('/status')
      .expect(200)
      .expect({
        products: [
          { type: 'COKE', rate: 20, count: 10 },
          { type: 'DEW', rate: 30, count: 10 },
          { type: 'PEPSI', rate: 25, count: 10 },
        ],
        money: [
          { count: 100, type: 'COIN', denomination: 1 },
          { count: 20, type: 'CASH', denomination: 10 },
        ],
      });
  });

  describe('{POST}/purchase', () => {
    it('returns 400 on invalid input', () => {
      return request(app.getHttpServer())
        .post('/purchase')
        .expect(400)
        .expect({
          statusCode: 400,
          message: ['money must be an array', 'products must be an array'],
          error: 'Bad Request',
        });
    });

    it('returns 400 on invalid cash', () => {
      return request(app.getHttpServer())
        .post('/purchase')
        .expect(400)
        .send({
          money: [{ count: 'a', type: MoneyType.CASH }],
          products: [new Coke(3)],
        })
        .expect({
          statusCode: 400,
          message: [
            'money.0.count must be a number conforming to the specified constraints',
          ],
          error: 'Bad Request',
        });
    });

    it('error insufficient fund is mapped', async (done) => {
      const result = await request(app.getHttpServer())
        .post('/purchase')
        .send({
          money: [newCash(2) as IMoneyInput],
          products: [new Coke(3)],
        } as IVendingInput);
      expect(result.body.message).toEqual(
        VendingErrors.INSUFFICIENT_CASH_PROVIDED
      );
      done();
    });

    it('error insufficient stock is mapped', async (done) => {
      const result = await request(app.getHttpServer())
        .post('/purchase')
        .send({
          money: [newCash(22) as IMoneyInput],
          products: [new Coke(11)],
        } as IVendingInput);
      expect(result.body.message).toEqual(VendingErrors.INSUFFICIENT_STOCK);
      done();
    });

    it('error change unavailable  is mapped', async (done) => {
      const counterSvc = moduleFixture.get<CounterService>(CounterService);
      counterSvc.withdraw(newCoin(100));
      const result = await request(app.getHttpServer())
        .post('/purchase')
        .send({
          money: [newCash(3) as IMoneyInput],
          products: [new Pepsi(1)],
        } as IVendingInput);
      expect(result.body.message).toEqual(VendingErrors.CHANGE_UNAVAILABLE);
      done();
    });

    it('processes order', async (done) => {
      const result = await request(app.getHttpServer())
        .post('/purchase')
        .send({
          money: [newCash(2) as IMoneyInput],
          products: [new Coke(1)],
        } as IVendingInput);
      expect(result.status).toEqual(201);
      const data = result.body as IVendingResult;
      expect(data).toBeDefined();
      done();
    });
  });
});
