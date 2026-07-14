import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const { t } = useTranslation("common");

  return (
    <footer
      className="border-t border-gray-200"
      style={{ backgroundColor: "#F9FAFB" }}
      role="contentinfo"
      aria-label="Site footer"
    >
      <div className="container mx-auto px-6 pt-8 pb-12">
        <div className="flex flex-col items-center gap-6">
          {/* Logo */}
          <Link to="/" className="inline-block">
            <img
              src="/logo-lightmode.svg"
              alt="VolleySmart"
              className="h-8 sm:h-10 md:h-8 w-auto"
              loading="eager"
            />
          </Link>

          {/* Legal links */}
          <div className="flex items-center gap-4 text-sm text-gray-600 whitespace-nowrap">
            <Link to="/terms" className="hover:underline">
              {t("menu.termsAndConditions")}
            </Link>
            <span>·</span>
            <Link to="/privacy" className="hover:underline">
              {t("menu.privacyPolicy")}
            </Link>
            <span>·</span>
            <Link to="/faqs" className="hover:underline">
              {t("nav.faqs")}
            </Link>
            <span>·</span>
            <Link to="/delete-account" className="hover:underline">
              {t("menu.deleteAccount", { defaultValue: "Delete account" })}
            </Link>
          </div>

          {/* Copyright */}
          <div className="text-sm text-gray-600">
            {t("footer.copyright")}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
