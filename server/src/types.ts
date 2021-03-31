import { Connection, EntityManager, IDatabaseDriver } from "@mikro-orm/core";
import { Request, Response } from 'express';

export interface MyContext {
  em: EntityManager<any> & EntityManager<IDatabaseDriver<Connection>>
  req: Request & { session },
  res: Response,
}