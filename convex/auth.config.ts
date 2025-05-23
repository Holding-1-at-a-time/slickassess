/**
    * @description      : 
    * @author           : rrome
    * @group            : 
    * @created          : 21/05/2025 - 23:24:48
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 21/05/2025
    * - Author          : rrome
    * - Modification    : 
**/
const authConfig = {
  providers: [
    // Uncomment this once you have set up a Clerk app
     {
       // Replace with your own Clerk Issuer URL from your "convex" JWT template
       // or with `process.env.CLERK_JWT_ISSUER_DOMAIN`
       // and configure CLERK_JWT_ISSUER_DOMAIN on the Convex Dashboard
       // See https://docs.convex.dev/auth/clerk#configuring-dev-and-prod-instances
       domain: process.env.NEXT_PUBLIC_CLERK_FRONTEND_API_URL,
       applicationID: "convex",
     },
  ],
};

export default authConfig;
