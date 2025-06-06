import { Router } from 'express';
import { ApiKeyController } from '../controllers/apiKey.controller';
import { authenticateToken, checkPermissions } from '../middleware/auth.middleware';
import { RequestHandler } from 'express';

const router = Router();

// Proteger todas las rutas con autenticación JWT
router.use(authenticateToken);

// Rutas para gestión de API keys
router.get('/', 
  checkPermissions(['settings:read']), 
  ApiKeyController.getAllApiKeys as RequestHandler
);

router.post('/', 
  checkPermissions(['settings:create']), 
  ApiKeyController.createApiKey as RequestHandler
);

router.get('/:id', 
  checkPermissions(['settings:read']), 
  ApiKeyController.getApiKeyById as RequestHandler
);

router.put('/:id/status', 
  checkPermissions(['settings:update']), 
  ApiKeyController.updateApiKeyStatus as RequestHandler
);

router.delete('/:id', 
  checkPermissions(['settings:delete']), 
  ApiKeyController.deleteApiKey as RequestHandler
);

export default router; 