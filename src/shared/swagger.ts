import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';

export function ApiAuth() {
  return applyDecorators(ApiBearerAuth());
}

export function ApiErrorResponses() {
  return applyDecorators(
    ApiResponse({ status: 400, description: 'Bad request' }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 403, description: 'Forbidden' }),
    ApiResponse({ status: 404, description: 'Not found' }),
    ApiResponse({ status: 429, description: 'Too many requests' }),
    ApiResponse({ status: 500, description: 'Internal server error' }),
  );
}

export function ApiPaginatedResponse<TModel extends Type<unknown>>(
  model: TModel,
  description = 'Successful response',
) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      description,
      schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { $ref: getSchemaPath(model) },
          },
          page: { type: 'number' },
          limit: { type: 'number' },
          total: { type: 'number' },
        },
      },
    }),
  );
}
