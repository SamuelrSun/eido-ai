// src/pages/TermsOfServicePage.tsx
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-2xl font-bold text-gray-800 mt-10 mb-4 border-b pb-2">{children}</h3>
);

const TermsOfServicePage = () => {
  return (
    <>
      <Helmet>
        <title>Terms of Service | Eido AI</title>
      </Helmet>
      <div className="bg-gray-50">
        <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
          <div className="bg-white p-8 md:p-12 rounded-2xl shadow-lg">
            <div className="text-center">
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
                Terms of Service
              </h1>
              <p className="mt-4 text-lg text-gray-500">
                Last Updated: June 18, 2025
              </p>
            </div>
          
            <div className="mt-12 text-gray-700 space-y-6">
              <p className="text-lg leading-relaxed">
                Welcome to Eido AI ("Eido," "we," "our," or "us"). These Terms of Service ("Terms") govern your access to and use of our web application and services (collectively, the "Service"). By accessing or using the Service, you agree to be bound by these Terms and our <Link to="/privacy" className="text-blue-600 hover:text-blue-800 underline">Privacy Policy</Link>.
              </p>

              <SectionTitle>1. Description of Service</SectionTitle>
              <p>Eido AI is an educational copilot designed to help users create smart, searchable knowledge bases from their course materials. The Service uses artificial intelligence to allow users to chat with their documents and generate study aids like flashcards and quizzes ("AI-Generated Content").</p>

              <SectionTitle>2. User Accounts</SectionTitle>
              <p>To access most features of the Service, you must register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete. You are responsible for safeguarding your password and for any activities or actions under your account.</p>
              
              <SectionTitle>3. User Content and Data</SectionTitle>
              <p>
                You retain full ownership of all documents, text, and other materials you upload to the Service ("User Content"). By uploading User Content, you grant Eido AI a worldwide, non-exclusive, royalty-free license to use, process, store, and transmit your User Content solely for the purpose of providing and improving the Service for you. This includes:
              </p>
              <ul className="list-disc list-outside space-y-2 pl-6">
                  <li>Processing your documents to create vector embeddings for search and retrieval.</li>
                  <li>Transmitting relevant portions of your User Content to our AI service providers (e.g., OpenAI, Weaviate) to generate responses and other AI-Generated Content.</li>
                  <li>Storing your User Content and AI-Generated Content on our secure cloud infrastructure (e.g., Supabase).</li>
              </ul>
              <p>You are solely responsible for your User Content and you represent and warrant that you own it or have all necessary rights to use it and grant us the license as described in these Terms.</p>

              <SectionTitle>4. Acceptable Use Policy</SectionTitle>
              <p>You agree not to use the Service to upload, create, or share any content that:</p>
              <ul className="list-disc list-outside space-y-2 pl-6">
                <li>Violates any applicable law or regulation.</li>
                <li>Infringes on the intellectual property rights of others (e.g., copyrighted material).</li>
                <li>Is unlawful, defamatory, harmful, obscene, or otherwise objectionable.</li>
                <li>Contains malicious code, viruses, or any other computer code, files, or programs designed to interrupt, destroy, or limit the functionality of any computer software or hardware or telecommunications equipment.</li>
              </ul>
              <p>Violation of this policy may result in the immediate suspension or termination of your account.</p>

              <SectionTitle>5. AI-Generated Content</SectionTitle>
              <p>The Service uses artificial intelligence to generate content such as chat responses, flashcards, and quizzes. While we strive for accuracy, AI-Generated Content may contain errors or inaccuracies. It is provided for educational and informational purposes only. You should independently verify any critical information before relying on it. Eido AI does not guarantee the accuracy, completeness, or usefulness of any AI-Generated Content.</p>
              
              <SectionTitle>6. Intellectual Property</SectionTitle>
              <p>Excluding your User Content, the Service and all materials therein, including, without limitation, software, images, text, graphics, logos, patents, trademarks, service marks, and copyrights (the "Eido AI Content"), and all Intellectual Property Rights related thereto, are the exclusive property of Eido AI. Use of the Eido AI Content for any purpose not expressly permitted by these Terms is strictly prohibited.</p>

              <SectionTitle>7. Termination</SectionTitle>
              <p>We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever, including but not limited to a breach of the Terms. If you wish to terminate your account, you may do so through the "Delete Account" feature in your profile settings. This action is irreversible.</p>

              <SectionTitle>8. Disclaimer of Warranties; Limitation of Liability</SectionTitle>
              <p>The Service is provided on an "AS IS" and "AS AVAILABLE" basis. Your use of the Service is at your sole risk. The Service is provided without warranties of any kind, whether express or implied. In no event shall Eido AI be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or in connection with your use of the Service.</p>

              <SectionTitle>9. Governing Law</SectionTitle>
              <p>These Terms shall be governed and construed in accordance with the laws of the State of California, United States, without regard to its conflict of law provisions.</p>
              
              <SectionTitle>10. Changes to Terms</SectionTitle>
              <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. By continuing to access or use our Service after any revisions become effective, you agree to be bound by the revised terms.</p>

              <SectionTitle>11. Contact Us</SectionTitle>
              <p>
                If you have any questions about these Terms, please contact us at: <a href="mailto:support@eido-ai.com" className="text-blue-600 hover:text-blue-800 underline">srwang@usc.edu</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TermsOfServicePage;
