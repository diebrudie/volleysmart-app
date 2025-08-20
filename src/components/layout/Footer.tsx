import Logo from "@/components/common/Logo";

const Footer = () => {
  return (
    <footer className="border-t border-glass-border glass">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            {/* Logo */}
            <Logo size="md" linkTo="/" />
          </div>

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
