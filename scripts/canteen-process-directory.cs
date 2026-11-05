using System;
using System.Runtime.InteropServices;
using System.Text;

// Best-effort Windows process working-directory lookup. No process is modified.
// The PEB layout is an OS implementation detail: fail closed on any read error
// or unsupported architecture, leaving the launcher's port protection in place.
public static class CanteenProcessDirectory
{
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern IntPtr OpenProcess(uint access, bool inherit, int processId);
    [DllImport("kernel32.dll")]
    static extern bool CloseHandle(IntPtr handle);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool IsWow64Process(IntPtr handle, out bool wow64);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool ReadProcessMemory(IntPtr handle, IntPtr address, byte[] buffer, IntPtr size, out IntPtr read);
    [DllImport("ntdll.dll")]
    static extern int NtQueryInformationProcess(IntPtr handle, int infoClass, byte[] buffer, int size, out int returned);

    static byte[] Read(IntPtr handle, IntPtr address, int size)
    {
        var buffer = new byte[size];
        IntPtr read;
        if (address == IntPtr.Zero || !ReadProcessMemory(handle, address, buffer, new IntPtr(size), out read) || read.ToInt64() != size)
            throw new InvalidOperationException("Process directory unavailable.");
        return buffer;
    }

    static IntPtr Pointer(byte[] buffer, int offset)
    {
        return IntPtr.Size == 8 ? new IntPtr(BitConverter.ToInt64(buffer, offset)) : new IntPtr(BitConverter.ToInt32(buffer, offset));
    }

    public static string ReadDirectory(int processId)
    {
        IntPtr handle = OpenProcess(0x0400 | 0x0010, false, processId);
        if (handle == IntPtr.Zero) return null;
        try
        {
            bool targetWow64, currentWow64;
            using (var current = System.Diagnostics.Process.GetCurrentProcess())
            {
                if (!IsWow64Process(handle, out targetWow64) || !IsWow64Process(current.Handle, out currentWow64) || targetWow64 != currentWow64)
                    return null;
            }
            var basic = new byte[IntPtr.Size * 6];
            int returned;
            if (NtQueryInformationProcess(handle, 0, basic, basic.Length, out returned) != 0) return null;
            IntPtr peb = Pointer(basic, IntPtr.Size);
            int paramsOffset = IntPtr.Size == 8 ? 0x20 : 0x10;
            IntPtr parameters = Pointer(Read(handle, IntPtr.Add(peb, paramsOffset), IntPtr.Size), 0);
            int directoryOffset = IntPtr.Size == 8 ? 0x38 : 0x24;
            byte[] directory = Read(handle, IntPtr.Add(parameters, directoryOffset), IntPtr.Size * 2);
            int length = BitConverter.ToUInt16(directory, 0);
            if (length == 0 || length > 32766 || length % 2 != 0) return null;
            return Encoding.Unicode.GetString(Read(handle, Pointer(directory, IntPtr.Size), length));
        }
        catch { return null; }
        finally { CloseHandle(handle); }
    }
}
