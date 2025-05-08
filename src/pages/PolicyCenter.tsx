import { useState } from "react";
import { 
  KeyRound, 
  Shield, 
  Smartphone, 
  Mail, 
  Cloud, 
  FileText,
  Users,
  Search
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { PolicyCard } from "@/components/policy/PolicyCard";
import { PageHeader } from "@/components/layout/PageHeader";

const policyData = [
  {
    id: 1,
    title: "Password Policy",
    summary: "Guidelines for creating and managing secure passwords across all company systems.",
    details: "1. Minimum Length: All passwords must be at least 12 characters long.\n\n2. Complexity: Passwords must include uppercase letters, lowercase letters, numbers, and special characters.\n\n3. Rotation: Passwords must be changed every 90 days.\n\n4. History: New passwords cannot match any of your previous 10 passwords.\n\n5. Storage: Never store passwords in plain text or share them via email or messaging.\n\n6. Password Manager: Use the company-provided password manager for generating and storing passwords.\n\n7. Multi-Factor Authentication: Enable MFA on all accounts that support it.",
    icon: <KeyRound className="h-5 w-5" />,
    lastUpdated: "April 15, 2023",
    department: "All Departments"
  },
  {
    id: 2,
    title: "Data Security Policy",
    summary: "Protocols for protecting sensitive company and customer data from unauthorized access.",
    details: "1. Classification: All data must be classified as Public, Internal, Confidential, or Restricted.\n\n2. Access Control: Access to data should follow the principle of least privilege.\n\n3. Encryption: All confidential and restricted data must be encrypted both at rest and in transit.\n\n4. Data Sharing: Never share confidential data via unsecured channels or with unauthorized parties.\n\n5. Data Retention: Follow the data retention schedule and securely destroy data when it's no longer needed.\n\n6. Incident Reporting: Report any suspected data breach or loss immediately to the security team.",
    icon: <Shield className="h-5 w-5" />,
    lastUpdated: "June 2, 2023",
    department: "All Departments"
  },
  {
    id: 3,
    title: "Mobile Device Policy",
    summary: "Rules for using personal and company-issued mobile devices for work purposes.",
    details: "1. Device Registration: All devices used for work must be registered with IT.\n\n2. Security Controls: Devices must have PIN/password protection, encryption, and remote wipe capability.\n\n3. Company Data: Company data should only be accessed through approved applications.\n\n4. Updates: Keep devices updated with the latest OS and security patches.\n\n5. Lost Devices: Report lost or stolen devices immediately to IT security.\n\n6. Personal Use: Limited personal use of company devices is permitted but must comply with acceptable use policies.",
    icon: <Smartphone className="h-5 w-5" />,
    lastUpdated: "March 10, 2023",
    department: "All Departments"
  },
  {
    id: 4,
    title: "Email Security Policy",
    summary: "Procedures for safe email usage and preventing phishing and social engineering attacks.",
    details: "1. Phishing Awareness: Be vigilant about suspicious emails, especially those with unexpected attachments or links.\n\n2. External Email Marking: All emails from external sources are marked [EXTERNAL] - be extra cautious with these.\n\n3. Attachments: Do not open attachments from unknown sources or unexpected attachments from known sources.\n\n4. Personal Email: Do not use personal email accounts for company business.\n\n5. Sensitive Information: Never send sensitive or confidential information via unencrypted email.\n\n6. Reporting: Report suspicious emails to security@company.com or use the Phish Alert Button.",
    icon: <Mail className="h-5 w-5" />,
    lastUpdated: "May 22, 2023",
    department: "All Departments"
  },
  {
    id: 5,
    title: "Cloud Services Policy",
    summary: "Guidelines for using approved cloud services and securing cloud-based company data.",
    details: "1. Approved Services: Only use company-approved cloud services for storing or processing company data.\n\n2. Authentication: Use strong passwords and enable MFA for all cloud service accounts.\n\n3. Data Storage: Be mindful of what data you store in cloud services and follow data classification guidelines.\n\n4. Sharing: Use secure sharing options and limit access to only those who need it.\n\n5. Personal Accounts: Do not use personal cloud accounts for company business.\n\n6. Offboarding: When employees leave, ensure all company data is removed from their accounts.",
    icon: <Cloud className="h-5 w-5" />,
    lastUpdated: "April 3, 2023",
    department: "IT"
  },
  {
    id: 6,
    title: "Acceptable Use Policy",
    summary: "Rules governing appropriate use of company IT resources, networks, and systems.",
    details: "1. Business Use: Company IT resources are primarily for business purposes.\n\n2. Prohibited Activities: Illegal activities, accessing inappropriate content, and unauthorized software installation are prohibited.\n\n3. Software Installation: Only install software from approved sources and with proper licensing.\n\n4. Resource Conservation: Be mindful of bandwidth usage and storage space.\n\n5. Monitoring: Be aware that the company may monitor system usage for security purposes.\n\n6. Personal Use: Limited personal use is permitted provided it does not interfere with work duties or violate other policies.",
    icon: <FileText className="h-5 w-5" />,
    lastUpdated: "February 15, 2023",
    department: "All Departments"
  },
  {
    id: 7,
    title: "Remote Work Security Policy",
    summary: "Security requirements for employees working outside of company premises.",
    details: "1. VPN Usage: Always connect through the company VPN when accessing internal resources.\n\n2. Public WiFi: Avoid using unsecured public WiFi for company work.\n\n3. Physical Security: Keep company devices secure and never leave them unattended in public places.\n\n4. Screen Privacy: Use screen protectors and be aware of shoulder surfing in public spaces.\n\n5. Home Network: Secure your home network with strong passwords and WPA2/WPA3 encryption.\n\n6. Work Area: Maintain a private work area where sensitive calls or information cannot be overheard or seen by others.",
    icon: <Users className="h-5 w-5" />,
    lastUpdated: "July 8, 2023",
    department: "All Departments"
  }
];

const PolicyCenter = () => {
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredPolicies = policyData.filter(policy =>
    policy.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    policy.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    policy.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
    policy.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Policy Center"
        description="Here's a quick guide to our core cybersecurity policies. Use this as a reference to stay compliant and secure."
      />
      
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <Input 
          placeholder="Search policies by keyword or department..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredPolicies.map((policy) => (
          <PolicyCard
            key={policy.id}
            title={policy.title}
            summary={policy.summary}
            details={policy.details}
            icon={policy.icon}
            lastUpdated={policy.lastUpdated}
            department={policy.department}
          />
        ))}
        
        {filteredPolicies.length === 0 && (
          <div className="col-span-2 text-center py-12">
            <p className="text-gray-500">No policies found matching your search query.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PolicyCenter;
