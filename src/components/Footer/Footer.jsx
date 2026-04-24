import React from "react";
import "./Footer.scss";
import { Link } from "react-router-dom";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import { FiMail, FiPhone, FiMapPin, FiTwitter, FiFacebook, FiInstagram, FiLinkedin } from "react-icons/fi";
import { useLanguage } from "../../context/LanguageContext";

const Footer = () => {
  const { t } = useLanguage();
  
  return (
  <footer className="footer">
    <div className="footer__container">
      {/* Main Footer Content */}
      <div className="footer__grid grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
        {/* Brand Section - Left Column, Row 1 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="footer__brand-section lg:col-span-1"
        >
          <div className="footer__brand mb-4">MegaBox</div>
          <p className="text-gray-300 text-sm leading-relaxed mb-6">
            {t("footer.description")}
          </p>
          <div className="flex ">
            <motion.a
              href="#"
              whileHover={{ y: -2 }}
              className="w-10 h-10 bg-white bg-opacity-10 rounded-full flex items-center justify-center hover:bg-opacity-20 transition-all duration-200"
            >
              <FiTwitter className="w-5 h-5 text-white" />
            </motion.a>
            <motion.a
              href="#"
              whileHover={{ y: -2 }}
              className="w-10 h-10 bg-white bg-opacity-10 rounded-full flex items-center justify-center hover:bg-opacity-20 transition-all duration-200"
            >
              <FiFacebook className="w-5 h-5 text-white" />
            </motion.a>
            <motion.a
              href="#"
              whileHover={{ y: -2 }}
              className="w-10 h-10 bg-white bg-opacity-10 rounded-full flex items-center justify-center hover:bg-opacity-20 transition-all duration-200"
            >
              <FiInstagram className="w-5 h-5 text-white" />
            </motion.a>
            <motion.a
              href="#"
              whileHover={{ y: -2 }}
              className="w-10 h-10 bg-white bg-opacity-10 rounded-full flex items-center justify-center hover:bg-opacity-20 transition-all duration-200"
            >
              <FiLinkedin className="w-5 h-5 text-white" />
            </motion.a>
          </div>
        </motion.div>

        {/* Quick Links - Right Column, Row 1 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="footer__quick-links"
        >
          <h3 className="text-lg font-semibold text-white mb-4">{t("footer.quickLinks")}</h3>
          <nav className="space-y-3">
            <Link to={"/"} className="footer__link block hover:text-white transition-colors duration-200">
              {t("footer.home")}
            </Link>
            <Link to={"/About"} className="footer__link block hover:text-white transition-colors duration-200">
              {t("footer.about")}
            </Link>
            <Link to={"/Partners"} className="footer__link block hover:text-white transition-colors duration-200">
              {t("footer.partners")}
            </Link>
            <Link to={"/Privacy"} className="footer__link block hover:text-white transition-colors duration-200">
              {t("footer.privacyPolicy")}
            </Link>
          </nav>
        </motion.div>

        {/* Support - Left Column, Row 2 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="footer__support"
        >
          <h3 className="text-lg font-semibold text-white mb-4">{t("footer.support")}</h3>
          <nav className="space-y-3">
            <Link to={"/Privacy-Removal"} className="footer__link block hover:text-white transition-colors duration-200">
              {t("footer.removalPolicy")}
            </Link>
            <Link to={"/copyright-feedback"} className="footer__link block hover:text-white transition-colors duration-200">
              {t("footer.reportIssue")}
            </Link>
            <Link to="/contact-support" className="footer__link block hover:text-white transition-colors duration-200">
              {t("footer.contactSupport")}
            </Link>
            <Link to="/account-deletion" className="footer__link block hover:text-white transition-colors duration-200">
              {t("footer.accountDeletion")}
            </Link>
          </nav>
        </motion.div>

        {/* Contact Info - Right Column, Row 2 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="footer__contact"
        >
          <h3 className="text-lg font-semibold text-white mb-4">{t("footer.contact")}</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <FiMail className="w-4 h-4 text-primary-300 flex-shrink-0" />
              <a href="mailto:support@megabox.com" className="footer__link text-sm hover:text-white transition-colors duration-200">
                support@megabox.com
              </a>
            </div>
            <div className="flex items-center space-x-3">
              <FiPhone className="w-4 h-4 text-primary-300 flex-shrink-0" />
              <span className="footer__link text-sm">+1 (555) 123-4567</span>
            </div>
            <div className="flex items-center space-x-3">
              <FiMapPin className="w-4 h-4 text-primary-300 flex-shrink-0" />
              <span className="footer__link text-sm">Tokyo, Japan</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="border-t border-white border-opacity-20 pt-6"
      >
        <div className="footer__bottom flex flex-col space-y-4">
          <p className="footer__copyright text-sm text-gray-300">
            &copy; {new Date().getFullYear()} MegaBox. {t("footer.allRightsReserved")}
          </p>
          <div className="footer__bottom-links flex flex-wrap gap-4 text-sm">
            <Link to="/Privacy-Removal" className="text-gray-300 hover:text-white transition-colors duration-200">
              {t("footer.removalPolicy")}
            </Link>
            <Link to="/Privacy" className="text-gray-300 hover:text-white transition-colors duration-200">
              {t("footer.privacy")}
            </Link>
            <Link to="/copyright-feedback" className="text-gray-300 hover:text-white transition-colors duration-200">
              {t("footer.report")}
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  </footer>
  );
};

export default Footer;
