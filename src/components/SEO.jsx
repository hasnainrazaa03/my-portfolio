import React from 'react';
import { Helmet } from 'react-helmet-async';
import { PERSONAL_INFO } from '../constants';

const SEO = () => {
  const description = "Portfolio of Hasnain Raza, an MSCS student at USC and former Aerospace Engineer specializing in AI/ML, Computer Vision, and Full Stack Development.";
  const keywords = "Hasnain Raza, Portfolio, AI Engineer, Machine Learning, Aerospace, USC, React, Python, Computer Vision, Deep Learning";
  const siteUrl = "https://hasnainraza.com"; 
  const image = "https://hasnainraza.com/profile.jpg";

  return (
    <Helmet>
      {/* ✅ ONLY Meta tags - NO title */}
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={PERSONAL_INFO.name} />
      
      <meta property="og:type" content="website" />
      <meta property="og:url" content={siteUrl} />
      <meta property="og:title" content="Hasnain Raza | Aerospace & AI Engineer" />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={siteUrl} />
      <meta property="twitter:title" content="Hasnain Raza | Aerospace & AI Engineer" />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />
      
      <meta name="theme-color" content="#0F172A" />
    </Helmet>
  );
};

export default SEO;
