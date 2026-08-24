import { feedback } from './lib/db/src/schema/feedback';
import { createInsertSchema } from 'drizzle-zod';

const s = createInsertSchema(feedback);
console.log(Object.keys(s.shape));
