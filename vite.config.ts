import {defineConfig} from 'vite';
import tailwind from '@tailwindcss/vite';
export default defineConfig({build:{emptyOutDir:false},plugins:[tailwind()],server:{proxy:{'/api':'http://127.0.0.1:8787'}}});