import React, { useState } from "react";
import { useQuery } from "react-query";
import { useFormik } from "formik";
import * as Yup from "yup";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import { FiSend, FiDownload, FiUpload, FiAlertTriangle, FiFileText, FiUser, FiMail, FiMapPin, FiCheckCircle } from "react-icons/fi";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { api } from "../../services/apiConfig";
import { useCookies } from "react-cookie";
import { ToastOptions } from "../../helpers/ToastOptions";
import { useLanguage } from "../../context/LanguageContext";
import './Feedback.scss';

export default function Feedback() {
    const { t, language } = useLanguage();
    const MAX_FILE_SIZE = 30 * 1024;
    const [MegaBox] = useCookies(['MegaBox'])

    const validation = Yup.object({
        type: Yup.string().required(t('feedback.required')),
        copyrightUrl: Yup.string().url(t('feedback.invalidUrl')).required(t('feedback.required')),
        copyrightOwnerName: Yup.string().required(t('feedback.required')),
        relationshipWithContent: Yup.string().required(t('feedback.required')),
        email: Yup.string().email(t('feedback.invalidEmail')).required(t('feedback.required')),
        phoneNumber: Yup.string().required(t('feedback.required')),
        country: Yup.string().required(t('feedback.required')),
        province: Yup.string().required(t('feedback.required')),
        streetAddress: Yup.string().required(t('feedback.required')),
        city: Yup.string().required(t('feedback.required')),
        postalCode: Yup.string().required(t('feedback.required')),
        signature: Yup.string().required(t('feedback.required')),
        agreement: Yup.bool().oneOf([true], t('feedback.mustAgree')),

        file: Yup
            .mixed()
            .required(t('feedback.fileRequired'))
            .test(
                "fileSize",
                t('feedback.fileSizeError'),
                value => value && value.size <= MAX_FILE_SIZE
            )
    });

    const [SendDataLoading, setSendDataLoading] = useState(false)

    // Active complaint types (localized) — the report is filed as a complaint.
    const { data: complaintTypes = [] } = useQuery(
        ['complainTypes', language],
        async () => (await api.get('/complain/types', { params: { lang: language } })).data?.types ?? [],
        { staleTime: 5 * 60 * 1000 },
    );

    const SendComp = async (values) => {
        if (!MegaBox.MegaBox) {
            toast.error(t('feedback.loginRequired'), ToastOptions("error"));
            return;
        }

        setSendDataLoading(true);
        try {
            const description = [
                `Infringing URL: ${values.copyrightUrl}`,
                `Rights owner: ${values.copyrightOwnerName}`,
                `Relationship to content: ${values.relationshipWithContent}`,
                `Phone: ${values.phoneNumber}`,
                `Address: ${values.streetAddress}, ${values.city}, ${values.province}, ${values.postalCode}, ${values.country}`,
                `Signature: ${values.signature}`,
                `Good-faith statement accepted: ${values.agreement ? 'yes' : 'no'}`,
            ].join('\n');

            const formData = new FormData();
            formData.append("typeId", values.type);
            formData.append("description", description);
            formData.append("email", values.email);
            formData.append("images", values.file);

            await api.post('/complain', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            formik.resetForm();
            toast.success(t('feedback.success'), ToastOptions("success"));
        } catch (err) {
            const message = err?.response?.data?.message;
            toast.error(
                (Array.isArray(message) ? message.join('\n') : message) || t('feedback.error'),
                ToastOptions("error"),
            );
        } finally {
            setSendDataLoading(false);
        }
    }

    const formik = useFormik({
        initialValues: {
            type: "",
            copyrightUrl: "",
            file: null,
            copyrightOwnerName: "",
            relationshipWithContent: "",
            email: "",
            phoneNumber: "",
            country: "",
            province: "",
            streetAddress: "",
            city: "",
            postalCode: "",
            signature: "",
            agreement: false,
        },
        validationSchema: validation,
        onSubmit: SendComp
    });

    const handleDownload = () => {
        const link = document.createElement("a");
        link.href = "https://res.cloudinary.com/dn6149nzx/raw/upload/v1752321748/megabox-copyright-feedback-professional_sgcflc.csv";
        link.download = "MegaBox_Terms.docx"; // This is the suggested filename for the download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="Feedback" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <div className="feedback-container">
                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="feedback-header"
                >
                    <div className="feedback-header__icon">
                        <FiAlertTriangle />
                    </div>
                    <h1>{t('feedback.title')}</h1>
                    <p>{t('feedback.subtitle')}</p>
                </motion.div>

                {/* Main Form */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="feedback-form"
                >
                    <div className="feedback-form__header">
                        <FiFileText />
                        <div>
                            <h2>{t('feedback.formTitle')}</h2>
                            <p>{t('feedback.formDesc')}</p>
                        </div>
                    </div>

                    <form onSubmit={(e) => {
                        e.preventDefault();
                        formik.handleSubmit(e);
                    }} className="p-8 space-y-6">
                        {/* Type of Infringement */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center">
                                <FiAlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                                {t('feedback.typeLabel')}
                            </label>
                            <select
                                name="type"
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                value={formik.values.type}
                                className={`w-full border rounded-lg px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${formik.touched.type && formik.errors.type
                                        ? "border-red-500 bg-red-50"
                                        : "border-gray-300 hover:border-gray-400"
                                    }`}
                            >
                                <option value="">{t('feedback.typePlaceholder')}</option>
                                {complaintTypes.map((type) => (
                                    <option key={type.id} value={type.id}>{type.name}</option>
                                ))}
                            </select>
                            {formik.touched.type && formik.errors.type && (
                                <p className="text-red-500 text-sm flex items-center">
                                    <FiAlertTriangle className="h-3 w-3 mr-1" />
                                    {formik.errors.type}
                                </p>
                            )}
                        </div>

                        {/* Copyright content URL */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">
                                {t('feedback.urlLabel')}
                            </label>
                            <input
                                type="url"
                                name="copyrightUrl"
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                value={formik.values.copyrightUrl}
                                placeholder={t('feedback.urlPlaceholder')}
                                className={`w-full border rounded-lg px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${formik.touched.copyrightUrl && formik.errors.copyrightUrl
                                        ? "border-red-500 bg-red-50"
                                        : "border-gray-300 hover:border-gray-400"
                                    }`}
                            />
                            {formik.touched.copyrightUrl && formik.errors.copyrightUrl && (
                                <p className="text-red-500 text-sm flex items-center">
                                    <FiAlertTriangle className="h-3 w-3 mr-1" />
                                    {formik.errors.copyrightUrl}
                                </p>
                            )}
                        </div>

                        {/* File Upload Section */}
                        <div className="space-y-4">
                            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                                <p className="text-indigo-800 text-sm mb-4">
                                    {t('feedback.fileDesc')}
                                </p>

                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        type="button"
                                        onClick={handleDownload}
                                        className="feedback-download-btn"
                                    >
                                        <FiDownload className="h-4 w-4" />
                                        {t('feedback.downloadTemplate')}
                                    </button>

                                    <label className="feedback-upload-btn">
                                        <FiUpload className="h-4 w-4" />
                                        <span>{t('feedback.uploadFile')}</span>
                                        <input
                                            type="file"
                                            accept=".csv,text/csv"
                                            name="file"
                                            onChange={(event) => {
                                                const file = event.currentTarget.files[0];
                                                formik.setFieldValue("file", file);
                                            }}
                                            className="hidden"
                                        />
                                    </label>
                                </div>

                                {/* Show uploaded file */}
                                {formik.values.file && (
                                    <div className="flex items-center gap-2 mt-3 bg-green-50 p-3 rounded-lg border border-green-200">
                                        <FiCheckCircle className="h-4 w-4 text-green-600" />
                                        <span className="text-sm text-green-700">{formik.values.file.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => formik.setFieldValue("file", null)}
                                            className="text-red-500 hover:text-red-700 text-sm ml-auto"
                                            title={t('feedback.removeFile')}
                                        >
                                            {t('feedback.removeFile')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Owner/Agent Name */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center">
                                <FiUser className="h-4 w-4 text-gray-500 mr-2" />
                                {t('feedback.ownerLabel')}
                            </label>
                            <input
                                type="text"
                                name="copyrightOwnerName"
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                value={formik.values.copyrightOwnerName}
                                placeholder={t('feedback.ownerPlaceholder')}
                                className={`w-full border rounded-lg px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${formik.touched.copyrightOwnerName && formik.errors.copyrightOwnerName
                                        ? "border-red-500 bg-red-50"
                                        : "border-gray-300 hover:border-gray-400"
                                    }`}
                            />
                            {formik.touched.copyrightOwnerName && formik.errors.copyrightOwnerName && (
                                <p className="text-red-500 text-sm flex items-center">
                                    <FiAlertTriangle className="h-3 w-3 mr-1" />
                                    {formik.errors.copyrightOwnerName}
                                </p>
                            )}
                        </div>

                        {/* Relationship with Content */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">
                                {t('feedback.relationshipLabel')}
                            </label>
                            <input
                                type="text"
                                name="relationshipWithContent"
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                value={formik.values.relationshipWithContent}
                                placeholder={t('feedback.relationshipPlaceholder')}
                                className={`w-full border rounded-lg px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${formik.touched.relationshipWithContent && formik.errors.relationshipWithContent
                                        ? "border-red-500 bg-red-50"
                                        : "border-gray-300 hover:border-gray-400"
                                    }`}
                            />
                            {formik.touched.relationshipWithContent && formik.errors.relationshipWithContent && (
                                <p className="text-red-500 text-sm flex items-center">
                                    <FiAlertTriangle className="h-3 w-3 mr-1" />
                                    {formik.errors.relationshipWithContent}
                                </p>
                            )}
                        </div>

                        {/* Contact Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 flex items-center">
                                    <FiMail className="h-4 w-4 text-gray-500 mr-2" />
                                    {t('feedback.emailLabel')}
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    value={formik.values.email}
                                    placeholder={t('feedback.emailPlaceholder')}
                                    className={`w-full border rounded-lg px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${formik.touched.email && formik.errors.email
                                            ? "border-red-500 bg-red-50"
                                            : "border-gray-300 hover:border-gray-400"
                                        }`}
                                />
                                {formik.touched.email && formik.errors.email && (
                                    <p className="text-red-500 text-sm flex items-center">
                                        <FiAlertTriangle className="h-3 w-3 mr-1" />
                                        {formik.errors.email}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">
                                    {t('feedback.phoneLabel')}
                                </label>
                                <input
                                    type="text"
                                    name="phoneNumber"
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    value={formik.values.phoneNumber}
                                    placeholder={t('feedback.phonePlaceholder')}
                                    className={`w-full border rounded-lg px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${formik.touched.phoneNumber && formik.errors.phoneNumber
                                            ? "border-red-500 bg-red-50"
                                            : "border-gray-300 hover:border-gray-400"
                                        }`}
                                />
                                {formik.touched.phoneNumber && formik.errors.phoneNumber && (
                                    <p className="text-red-500 text-sm flex items-center">
                                        <FiAlertTriangle className="h-3 w-3 mr-1" />
                                        {formik.errors.phoneNumber}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Address Information */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                                <FiMapPin className="h-5 w-5 text-gray-500 mr-2" />
                                {t('feedback.addressTitle')}
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">{t('feedback.countryLabel')}</label>
                                    <input
                                        type="text"
                                        name="country"
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        value={formik.values.country}
                                        placeholder={t('feedback.countryPlaceholder')}
                                        className={`w-full border rounded-lg px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${formik.touched.country && formik.errors.country
                                                ? "border-red-500 bg-red-50"
                                                : "border-gray-300 hover:border-gray-400"
                                            }`}
                                    />
                                    {formik.touched.country && formik.errors.country && (
                                        <p className="text-red-500 text-sm flex items-center">
                                            <FiAlertTriangle className="h-3 w-3 mr-1" />
                                            {formik.errors.country}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">{t('feedback.provinceLabel')}</label>
                                    <input
                                        type="text"
                                        name="province"
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        value={formik.values.province}
                                        placeholder={t('feedback.provincePlaceholder')}
                                        className={`w-full border rounded-lg px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${formik.touched.province && formik.errors.province
                                                ? "border-red-500 bg-red-50"
                                                : "border-gray-300 hover:border-gray-400"
                                            }`}
                                    />
                                    {formik.touched.province && formik.errors.province && (
                                        <p className="text-red-500 text-sm flex items-center">
                                            <FiAlertTriangle className="h-3 w-3 mr-1" />
                                            {formik.errors.province}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">{t('feedback.streetLabel')}</label>
                                    <input
                                        type="text"
                                        name="streetAddress"
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        value={formik.values.streetAddress}
                                        placeholder={t('feedback.streetPlaceholder')}
                                        className={`w-full border rounded-lg px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${formik.touched.streetAddress && formik.errors.streetAddress
                                                ? "border-red-500 bg-red-50"
                                                : "border-gray-300 hover:border-gray-400"
                                            }`}
                                    />
                                    {formik.touched.streetAddress && formik.errors.streetAddress && (
                                        <p className="text-red-500 text-sm flex items-center">
                                            <FiAlertTriangle className="h-3 w-3 mr-1" />
                                            {formik.errors.streetAddress}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">{t('feedback.cityLabel')}</label>
                                    <input
                                        type="text"
                                        name="city"
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        value={formik.values.city}
                                        placeholder={t('feedback.cityPlaceholder')}
                                        className={`w-full border rounded-lg px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${formik.touched.city && formik.errors.city
                                                ? "border-red-500 bg-red-50"
                                                : "border-gray-300 hover:border-gray-400"
                                            }`}
                                    />
                                    {formik.touched.city && formik.errors.city && (
                                        <p className="text-red-500 text-sm flex items-center">
                                            <FiAlertTriangle className="h-3 w-3 mr-1" />
                                            {formik.errors.city}
                                        </p>
                                    )}
                                </div>

                                <div className="md:col-span-2 space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">{t('feedback.postalLabel')}</label>
                                    <input
                                        type="text"
                                        name="postalCode"
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        value={formik.values.postalCode}
                                        placeholder={t('feedback.postalPlaceholder')}
                                        className={`w-full border rounded-lg px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${formik.touched.postalCode && formik.errors.postalCode
                                                ? "border-red-500 bg-red-50"
                                                : "border-gray-300 hover:border-gray-400"
                                            }`}
                                    />
                                    {formik.touched.postalCode && formik.errors.postalCode && (
                                        <p className="text-red-500 text-sm flex items-center">
                                            <FiAlertTriangle className="h-3 w-3 mr-1" />
                                            {formik.errors.postalCode}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Signature */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">
                                {t('feedback.signatureLabel')}
                            </label>
                            <input
                                type="text"
                                name="signature"
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                value={formik.values.signature}
                                placeholder={t('feedback.signaturePlaceholder')}
                                className={`w-full border rounded-lg px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${formik.touched.signature && formik.errors.signature
                                        ? "border-red-500 bg-red-50"
                                        : "border-gray-300 hover:border-gray-400"
                                    }`}
                            />
                            {formik.touched.signature && formik.errors.signature && (
                                <p className="text-red-500 text-sm flex items-center">
                                    <FiAlertTriangle className="h-3 w-3 mr-1" />
                                    {formik.errors.signature}
                                </p>
                            )}
                        </div>

                        {/* Agreement */}
                        <div className="space-y-4">
                            <div className="flex items-start space-x-3">
                                <input
                                    id="agreement"
                                    name="agreement"
                                    type="checkbox"
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    checked={formik.values.agreement}
                                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <label htmlFor="agreement" className="text-sm text-gray-700">
                                    {t('feedback.agreementLabel')}
                                </label>
                            </div>
                            {formik.touched.agreement && formik.errors.agreement && (
                                <p className="text-red-500 text-sm flex items-center">
                                    <FiAlertTriangle className="h-3 w-3 mr-1" />
                                    {formik.errors.agreement}
                                </p>
                            )}

                            {/* Agreement Notice */}
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <h4 className="font-semibold text-gray-900 mb-3">{t('feedback.agreementTitle')}</h4>
                                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                                    <li>{t('feedback.agreement1')}</li>
                                    <li>{t('feedback.agreement2')}</li>
                                </ol>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={SendDataLoading || !formik.isValid}
                            className={`feedback-submit-btn ${(SendDataLoading || !formik.isValid) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={(e) => {
                                // Validate form before submission
                                if (!formik.isValid) {
                                    e.preventDefault();
                                    formik.validateForm().then(() => {
                                        if (Object.keys(formik.errors).length > 0) {
                                            toast.error(t('feedback.fillAllFields') || 'Please fill all required fields correctly', ToastOptions("error"));
                                        }
                                    });
                                }
                            }}
                        >
                            <FiSend className="h-5 w-5" />
                            {SendDataLoading ? t('feedback.submitting') : t('feedback.submit')}
                        </motion.button>
                    </form>
                </motion.div>

                {/* Back to Home */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="text-center mt-8"
                >
                    <Link
                        to="/"
                        className="feedback-back-btn"
                    >
                        {t('feedback.backToHome')}
                    </Link>
                </motion.div>
            </div>
        </div>
    );
}
