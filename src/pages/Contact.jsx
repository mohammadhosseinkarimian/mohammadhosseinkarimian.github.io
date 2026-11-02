import React, { useState } from 'react'
import Icon from '../components/Icons'
import { ButtonLink, External, PageIntro, Reveal, Eyebrow } from '../components/UI'
import { person } from '../data/portfolio'

export default function Contact(){
  const [copied,setCopied]=useState('')
  const copy=async()=>{
    try {await navigator.clipboard.writeText(person.email);setCopied('Email copied.')}
    catch{setCopied('Clipboard unavailable. You can select the email address instead.')}
  }
  return <>
    <PageIntro index="04" tag="CONTACT" title={<>Let's start a <em>conversation.</em></>} description="Open to conversations about machine learning, AI research, autonomous systems and thoughtful digital products."/>
    <section className="contact-section shell">
      <div className="contact-simple">
        <Reveal className="contact-info">
          <Eyebrow>DIRECT CONTACT</Eyebrow>
          <h2>One message.<br/><em>A clear starting point.</em></h2>
          <p>Email is the best way to reach me. You can also find my professional background and code through the profiles below.</p>
          <div className="contact-email">
            <span>EMAIL ADDRESS</span>
            <a href={`mailto:${person.email}`}>{person.email} <Icon name="upRight" size={17}/></a>
            <button type="button" onClick={copy}><Icon name={copied==='Email copied.'?'check':'copy'} size={17}/> {copied==='Email copied.'?'COPIED':'COPY ADDRESS'}</button>
            <div role="status" className="copy-status">{copied}</div>
          </div>
        </Reveal>
        <Reveal delay={90} className="contact-direct-card">
          <div className="contact-direct-header"><span><Icon name="mail" size={19}/> OPEN YOUR EMAIL APP</span><span>01 / 01</span></div>
          <div className="contact-direct-icon"><Icon name="send" size={40} strokeWidth={1.3}/></div>
          <h3>Have a project or research question?</h3>
          <p>Send an email directly. No account, signup or on-site form is required.</p>
          <a className="button button-primary contact-mail-button" href={`mailto:${person.email}?subject=${encodeURIComponent('Hello MohammadHossein')}`}>
            Write an email <span className="button-icon"><Icon name="upRight" size={18}/></span>
          </a>
          <div className="contact-direct-footer"><span>OTHER PLACES TO CONNECT</span><div>
            <External href={person.linkedin} aria-label="LinkedIn profile"><Icon name="linkedin" size={19}/> LinkedIn <Icon name="upRight" size={15}/></External>
            <External href={person.github} aria-label="GitHub profile"><Icon name="github" size={19}/> GitHub <Icon name="upRight" size={15}/></External>
          </div></div>
        </Reveal>
      </div>
    </section>
  </>
}
