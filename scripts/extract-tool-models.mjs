// Parses the OpenRouter API response to extract free models that support tools
const data = JSON.parse(process.argv[2]);
const freeToolModels = data.data.filter(m =>
  m.pricing?.prompt === '0' &&
  m.pricing?.completion === '0' &&
  Array.isArray(m.supported_parameters) &&
  m.supported_parameters.includes('tools') &&
  m.supported_parameters.includes('tool_choice')
);
console.log(JSON.stringify(freeToolModels.map(m => ({ id: m.id, name: m.name, context: m.context_length, params: m.supported_parameters.filter(p => ['tools','tool_choice','structured_outputs','response_format'].includes(p)) })), null, 2));
