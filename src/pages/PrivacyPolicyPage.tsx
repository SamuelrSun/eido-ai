// src/pages/PrivacyPolicyPage.tsx
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-2xl font-bold text-gray-800 mt-10 mb-4 border-b pb-2">{children}</h3>
);

const PrivacyPolicyPage = () => {
  return (
    <>
      <Helmet>
        <title>Privacy Policy | Eido AI Copilot</title>
      </Helmet>
      <div className="bg-gray-50">
        <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
          <div className="bg-white p-8 md:p-12 rounded-2xl shadow-lg">
            <div className="text-center">
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
                Privacy Policy
              </h1>
              <p className="mt-4 text-lg text-gray-500">
                Last Updated: June 18, 2025
              </p>
            </div>
          
            <div className="mt-12 text-gray-700 space-y-6">
              <p className="text-lg leading-relaxed">
                Welcome to Eido AI Copilot ("Eido," "we," "our," or "us"). We are committed to protecting your privacy and being transparent about how we handle your data. This Privacy Policy explains what information we collect, how we use and share it, and your rights concerning your data when you use our application (the "Service"). This policy is an integral part of our <Link to="/terms" className="text-blue-600 hover:text-blue-800 underline">Terms of Service</Link>.
              </p>

              <SectionTitle>1. Information We Collect</SectionTitle>
              <p>To provide our Service, we collect the following types of information:</p>
              <ul className="list-disc list-outside space-y-3 pl-6">
                  <li>
                    <strong>Account Information:</strong> When you register, we collect personal information such as your name, email address, and encrypted password. If you sign up using Google OAuth, we receive your name and email address from Google.
                  </li>
                  <li>
                    <strong>User Content:</strong> Any files, documents, text, and images you upload to the Service to create your knowledge bases. You retain full ownership of your User Content.
                  </li>
                  <li>
                    <strong>Service Usage Data:</strong> We collect information about your interactions with the Service, including the questions you ask the AI, the AI-generated responses, flashcards, and quizzes you create. This is stored to provide you with your conversation history and access to your study materials.
                  </li>
              </ul>

              <SectionTitle>2. How We Use Your Information</SectionTitle>
              <p>We use your information for the sole purpose of providing and improving the Eido AI Copilot service. This includes:</p>
              <ul className="list-disc list-outside space-y-3 pl-6">
                <li><strong>To Operate the Service:</strong> We use your Account Information to create and manage your account. We process your User Content to power the core features of the app, such as enabling the AI to answer questions about your documents.</li>
                <li><strong>To Provide AI Features:</strong> To generate chat responses, flashcards, and quizzes, we send relevant portions of your User Content to our AI service providers.</li>
                <li><strong>To Improve Our Service:</strong> We may analyze anonymized usage data to understand how our features are being used, diagnose technical issues, and improve the overall user experience. We will never use your personal User Content to train our own models without your explicit consent.</li>
              </ul>
              
              <SectionTitle>3. How We Share and Disclose Information</SectionTitle>
              <p>We do not sell your personal information. We only share your data with the essential third-party service providers (sub-processors) that are required to operate our Service:</p>
              <ul className="list-disc list-outside space-y-3 pl-6">
                  <li>
                    <strong>Supabase:</strong> We use Supabase for our primary database, user authentication, and file storage. Your Account Information, Service Usage Data, and uploaded files are stored securely with Supabase.
                  </li>
                  <li>
                    <strong>Weaviate:</strong> We use Weaviate as our vector database. When you upload a document, we create vector embeddings (numerical representations) of your content, which are stored in Weaviate to enable fast and relevant semantic search.
                  </li>
                  <li>
                    <strong>OpenAI:</strong> As our primary AI model provider, we send relevant text chunks from your User Content, along with your query, to the OpenAI API to generate intelligent responses. Per OpenAI's policy, they do not use data submitted via their API to train their models.
                  </li>
              </ul>
              <p>We may also disclose your information if required by law or to protect the rights, property, or safety of Eido AI Copilot, our users, or others.</p>

              <SectionTitle>4. Data Storage, Security, and Retention</SectionTitle>
              <p>We take the security of your data very seriously. We rely on the industry-standard security practices of our cloud providers (Supabase, Weaviate, and OpenAI). All data is encrypted in transit and at rest.</p>
              <p>We retain your data for as long as your account is active. If you choose to delete your account, we will initiate a process to permanently delete all your associated data, including your account information, user content, and usage data from all our systems and those of our sub-processors within 30 days.</p>
              
              <SectionTitle>5. Your Rights and Choices</SectionTitle>
              <p>You have control over your personal information. You have the right to:</p>
              <ul className="list-disc list-outside space-y-3 pl-6">
                <li><strong>Access and Update:</strong> You can access and update your account information at any time through your profile settings.</li>
                <li><strong>Data Portability:</strong> You can download the files you have uploaded to the Service at any time.</li>
                <li><strong>Deletion:</strong> You can delete your account at any time through the "Delete Account" feature in your profile settings. This action is irreversible and will permanently delete all of your data as described in the section above.</li>
              </ul>

              <SectionTitle>6. Children's Privacy</SectionTitle>
              <p>Our Service is not intended for or directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13, we will take steps to delete such information from our files as soon as possible.</p>

              <SectionTitle>7. Contact Us</SectionTitle>
              <p>
                If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at: <a href="mailto:privacy@eido-ai.com" className="text-blue-600 hover:text-blue-800 underline">privacy@eido-ai.com</a>.

              </p>
              <p>Mailing: 17 Moonray, Irvine, CA, 92603</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PrivacyPolicyPage;

