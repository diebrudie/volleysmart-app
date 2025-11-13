import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer
      className="border-t border-gray-200"
      style={{ backgroundColor: "#F9FAFB" }}
      role="contentinfo"
      aria-label="Site footer"
    >
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Logo (light-mode asset, fixed) */}
          <Link to="/" className="inline-block">
            <img
              src="/logo-lightmode.svg"
              alt="VolleySmart"
              className="h-8 sm:h-10 md:h-8 w-auto"
              loading="eager"
            />
          </Link>

          {/* Copyright (fixed neutral color) */}
          <div className="text-sm text-gray-600">
            © 2025 VolleySmart. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
