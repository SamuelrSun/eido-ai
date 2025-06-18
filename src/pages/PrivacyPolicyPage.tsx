// src/pages/PrivacyPolicyPage.tsx
import React from 'react';
import { Helmet } from 'react-helmet-async';

const PrivacyPolicyPage = () => {
  return (
    <>
      <Helmet>
        <title>Privacy Policy | Eido AI</title>
      </Helmet>
      <div className="bg-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-extrabold text-gray-900 text-center">Privacy Policy</h1>
          <p className="mt-4 text-center text-lg text-gray-600">Last Updated: June 17, 2025</p>
          
          <div className="mt-10 prose prose-indigo lg:prose-lg text-gray-700 mx-auto">
            <p>
              Welcome to Eido AI ("we," "our," or "us"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.
            </p>

            <h2>1. Information We Collect</h2>
            <p>We may collect information about you in a variety of ways. The information we may collect on the Service includes:</p>
            <ul>
              <li>
                <strong>Personal Data:</strong> Personally identifiable information, such as your name and email address, that you voluntarily give to us when you register with the application.
              </li>
              <li>
                <strong>User Content:</strong> All documents, text, images, and other content you upload to create your knowledge bases. This content is the core of your use of Eido AI.
              </li>
               <li>
                <strong>Interaction Data:</strong> We store the questions you ask our AI, the responses it provides, and your interactions with features like flashcards and quizzes to provide you with a history of your activities and improve our services.
              </li>
            </ul>

            <h2>2. Use of Your Information</h2>
            <p>Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the application to:</p>
            <ul>
              <li>Create and manage your account.</li>
              <li>Process your uploaded documents to create vector embeddings for our AI to access.</li>
              <li>Provide you with AI-powered tutoring, flashcards, and quizzes based on your User Content.</li>
              <li>Monitor and analyze usage and trends to improve your experience with the application.</li>
            </ul>
            
            <h2>3. Disclosure of Your Information</h2>
            <p>We do not share your information with any third parties except as described in this Privacy Policy. We may share information we have collected about you in certain situations:</p>
            <ul>
                <li>
                    <strong>With Our Service Providers:</strong> We use third-party services for hosting, database management, and AI processing.
                    <ul>
                        <li><strong>Supabase:</strong> For database hosting and user authentication.</li>
                        <li><strong>Weaviate:</strong> For creating and storing vector embeddings of your User Content.</li>
                        <li><strong>OpenAI:</strong> To process your queries and generate AI responses. Your content may be sent to OpenAI to provide the service.</li>
                    </ul>
                </li>
                 <li>
                    <strong>By Law or to Protect Rights:</strong> If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others.
                </li>
            </ul>

            <h2>4. Security of Your Information</h2>
            <p>
              We use administrative, technical, and physical security measures to help protect your personal information and User Content. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
            </p>
            
            <h2>5. Your Data Rights</h2>
            <p>You have the right to:</p>
            <ul>
                <li>Access the personal data we hold about you.</li>
                <li>Request that we correct any errors in the data we hold.</li>
                <li>Request that we delete your data. You can do this via the "Delete Account" button in your profile settings. This action is irreversible and will permanently delete your account and all associated data from our systems.</li>
            </ul>

            <h2>6. Contact Us</h2>
            <p>
              If you have questions or comments about this Privacy Policy, please contact us at: <a href="mailto:srwang@usc.edu">srwang@usc.edu or 17 Moonray, Irvine, CA, 92603</a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default PrivacyPolicyPage;

