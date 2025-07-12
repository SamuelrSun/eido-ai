// supabase/functions/delete-from-cloudinary/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const CLOUDINARY_CLOUD_NAME = Deno.env.get("CLOUDINARY_CLOUD_NAME");
const CLOUDINARY_API_KEY = Deno.env.get("CLOUDINARY_API_KEY");
const CLOUDINARY_API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET");

async function deleteFromCloudinary(publicId: string) {
    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`;
    const timestamp = Math.round((new Date()).getTime() / 1000);

    const paramsToSign = {
        public_id: publicId,
        timestamp: timestamp.toString(),
    };

    const signatureString = `public_id=${paramsToSign.public_id}&timestamp=${paramsToSign.timestamp}${CLOUDINARY_API_SECRET!}`;
    const signature = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(signatureString))
        .then(hash => Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join(''));

    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('api_key', CLOUDINARY_API_KEY!);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);

    const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Cloudinary deletion failed: ${JSON.stringify(errorData)}`);
    }

    return await response.json();
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
            throw new Error("Cloudinary environment variables are not properly configured.");
        }

        const { file_id } = await req.json();
        if (!file_id) {
            throw new Error("Missing 'file_id' in the request body.");
        }

        const publicId = `thumbnails/${file_id}`;
        console.log(`[CLOUDINARY-DELETE] Attempting to delete public_id: ${publicId}`);

        const result = await deleteFromCloudinary(publicId);

        console.log(`[CLOUDINARY-DELETE] Successfully deleted public_id: ${publicId}. Result:`, result);

        return new Response(JSON.stringify({ success: true, result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    } catch (error) {
        console.error('[CRITICAL-ERROR] in delete-from-cloudinary function:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});