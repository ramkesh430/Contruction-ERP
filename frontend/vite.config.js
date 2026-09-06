import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// host:true binds to 0.0.0.0 (required inside a container); allowedHosts:true
// disables Vite's Host-header allowlist, which otherwise rejects any request
// whose Host doesn't match localhost — including the public tunnel hostname
// this app is actually served through when deployed without a fixed domain.
export default defineConfig({plugins:[react()],server:{port:5173,host:true,allowedHosts:true}});
