import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-glass-border glass">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Logo */}
          <Link to="/" className="inline-block">
            <img
              src="/logo-lightmode.svg"
              alt="VolleySmart"
              className="h-8 sm:h-10 md:h-8 w-auto transition-all duration-300"
              loading="eager"
            />
          </Link>

          {/* Copyright */}
          <div className="text-sm text-muted-foreground">
            © 2025 VolleySmart. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
