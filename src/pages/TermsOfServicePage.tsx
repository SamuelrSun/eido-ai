// src/pages/TermsOfServicePage.tsx
import React from 'react';
import { Helmet } from 'react-helmet-async';

const TermsOfServicePage = () => {
  return (
    <>
      <Helmet>
        <title>Terms of Service | Eido AI</title>
      </Helmet>
      <div className="bg-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-extrabold text-gray-900 text-center">Terms of Service</h1>
          <p className="mt-4 text-center text-lg text-gray-600">Last Updated: June 18, 2025</p>
          
          <div className="mt-10 prose prose-indigo lg:prose-lg text-gray-700 mx-auto">
            <p>
              Please read these Terms of Service ("Terms", "Terms of Service") carefully before using the Eido AI application (the "Service") operated by us.
            </p>

            <h2>1. Accounts</h2>
            <p>When you create an account with us, you must provide us with information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.</p>

            <h2>2. User Content</h2>
            <p>
              Our Service allows you to post, link, store, share and otherwise make available certain information, text, documents, images, or other material ("User Content"). You are responsible for the User Content that you post to the Service, including its legality, reliability, and appropriateness. By posting User Content to the Service, you grant us the right and license to use, modify, process, and transmit the User Content to provide the features of the Service, such as generating AI responses, flashcards, and quizzes.
            </p>

            <h2>3. Acceptable Use</h2>
            <p>You agree not to use the Service for any purpose that is illegal or prohibited by these Terms. You agree not to use the Service to:</p>
            <ul>
              <li>Upload or transmit any content that is unlawful, harmful, threatening, abusive, or otherwise objectionable.</li>
              <li>Violate the intellectual property rights of others.</li>
              <li>Attempt to gain unauthorized access to the Service or its related systems or networks.</li>
            </ul>

            <h2>4. Intellectual Property</h2>
            <p>The Service and its original content (excluding User Content), features, and functionality are and will remain the exclusive property of Eido AI and its licensors. You retain all of your rights to any User Content you submit.</p>
            
            <h2>5. Termination</h2>
            <p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease.</p>

            <h2>6. Limitation Of Liability</h2>
            <p>In no event shall Eido AI, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.</p>
            
            <h2>7. Changes</h2>
            <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.</p>

            <h2>8. Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us at: <a href="mailto:terms@eido-ai.com">terms@eido-ai.com</a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default TermsOfServicePage;