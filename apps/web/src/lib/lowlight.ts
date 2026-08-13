import { createLowlight, all } from 'lowlight';

// Create lowlight instance with all common languages pre-registered
const lowlight = createLowlight(all);

export default lowlight;
