
import { useEffect } from "react";
import { Navigate } from "react-router-dom";

// This component redirects users from the old "upload" route to the new "database" route
const UploadPage = () => {
  useEffect(() => {
    console.log("Redirecting from /upload to /database");
  }, []);

  return <Navigate to="/database" replace />;
};

export default UploadPage;
