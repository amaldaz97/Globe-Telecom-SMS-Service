import { Router } from 'express';
import { handleDlrWebhook } from '../controllers/dlr.controller';
import { handleMoWebhook } from '../controllers/mo.controller';

const router = Router();

router.get('/dlr', handleDlrWebhook);
router.get('/mo', handleMoWebhook);

export default router;
