import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result.split(',')[1])
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

export default function ResumeSettings({ session }) {
  const [resume, setResume] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('resume_profile')
      .select('filename, updated_at')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setResume(data) })
  }, [session.user.id])

  async function handleUpload(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file')
      setStatus('error')
      return
    }

    setStatus('loading')
    setError('')

    try {
      const pdf_base64 = await fileToBase64(file)
      const { data, error: fnError } = await supabase.functions.invoke('parse-resume', {
        body: { pdf_base64, filename: file.name },
      })

      if (fnError || data?.error || !data?.resume_text) {
        setError(data?.error || fnError?.message || "Couldn't read this resume — try again")
        setStatus('error')
        return
      }

      const { data: saved, error: saveError } = await supabase
        .from('resume_profile')
        .upsert({ user_id: session.user.id, filename: file.name, resume_text: data.resume_text, updated_at: new Date().toISOString() })
        .select('filename, updated_at')
        .single()

      if (saveError || !saved) {
        setError('Resume was read but could not be saved — try again')
        setStatus('error')
        return
      }

      setResume(saved)
      setStatus('idle')
    } catch {
      setError("Couldn't read this resume — try again")
      setStatus('error')
    }
  }

  return (
    <div className="jobs-section">
      <h2>Resume</h2>
      <p className="jobs-card-meta">
        Used to score how well new job finds match your background. Upload a PDF to enable match scoring on the New Finds tab.
      </p>

      {resume ? (
        <p className="jobs-card-notes">
          Resume on file: <strong>{resume.filename}</strong> — updated {new Date(resume.updated_at).toLocaleDateString()}
        </p>
      ) : (
        <p className="jobs-card-notes">No resume uploaded yet.</p>
      )}

      {status === 'error' && <p className="jobs-card-meta">{error}</p>}

      <label className="manage-add-btn" style={{ display: 'inline-block', cursor: 'pointer', marginTop: 12 }}>
        {status === 'loading' ? 'Reading resume…' : resume ? 'Replace resume (PDF)' : 'Upload resume (PDF)'}
        <input
          type="file"
          accept="application/pdf"
          onChange={handleUpload}
          disabled={status === 'loading'}
          style={{ display: 'none' }}
        />
      </label>
    </div>
  )
}
