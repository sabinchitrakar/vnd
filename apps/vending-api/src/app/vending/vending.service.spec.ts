import { Test } from '@nestjs/testing';
import { VendingService } from './vending.service';
import { InventoryModule } from './../inventory/inventory.module';
import { CounterModule } from './../counter/counter.module';
import { newCash, newCoin } from '../money/money.model';
import { Coke, Pepsi } from '../product/product.model';
import { CounterService } from '../counter/counter.service';
import { VendingErrors } from '@vnd/common';

describe('InventoryService', () => {
  let vendingSvc: VendingService;
  let counterSvc: CounterService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [],
      imports: [InventoryModule, CounterModule],
      providers: [VendingService],
    }).compile();

    vendingSvc = moduleRef.get<VendingService>(VendingService);
    counterSvc = moduleRef.get<CounterService>(CounterService);
  });

  describe('Status Test', () => {
    it('returns status of cash and stock', () => {
      const status = vendingSvc.showStatus();
      expect(status).toBeDefined();
      expect(Array.isArray(status.money)).toEqual(true);
      expect(Array.isArray(status.products)).toEqual(true);
    });
  });

  describe('Purchase Test', () => {
    it('returns Error On Insufficient Cash Input', () => {
      expect(() => {
        vendingSvc.processPurchase([newCash(1)], [new Coke(3)]);
      }).toThrowError(VendingErrors.INSUFFICIENT_CASH_PROVIDED);
    });
    it('returns Error On Insufficient Stock', () => {
      expect(() => {
        vendingSvc.processPurchase([newCash(13)], [new Coke(13)]);
      }).toThrowError(VendingErrors.INSUFFICIENT_STOCK);
    });
    it('returns Error On Insufficient Change', () => {
      counterSvc.withdraw(newCoin(100));
      expect(() => {
        vendingSvc.processPurchase([newCash(2)], [new Pepsi(1)]);
      }).toThrowError(VendingErrors.CHANGE_UNAVAILABLE);
    });
    it('Performs Purchase', () => {
      const result = vendingSvc.processPurchase([newCash(2)], [new Pepsi(1)]);
      expect(result.products[0].count).toEqual(1);
      expect(CounterService.getTotalAmount(result.money)).toEqual(5);
    });
  });
});