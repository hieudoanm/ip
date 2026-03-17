/*
Copyright © 2026 NAME HERE <EMAIL ADDRESS>
*/
package cmd

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/spf13/cobra"
)

// IPInfo mirrors the TypeScript IPInfo type
type IPInfo struct {
	IP          string `json:"ip"`
	Version     string `json:"version"`
	City        string `json:"city,omitempty"`
	Region      string `json:"region,omitempty"`
	CountryName string `json:"country_name,omitempty"`
	CountryCode string `json:"country_code,omitempty"`
	Postal      string `json:"postal,omitempty"`
	Latitude    string `json:"latitude,omitempty"`
	Longitude   string `json:"longitude,omitempty"`
	Timezone    string `json:"timezone,omitempty"`
	Org         string `json:"org,omitempty"`
	ASN         string `json:"asn,omitempty"`
}

func fetchPublicIP() (string, error) {
	resp, err := http.Get("https://api.ipify.org?format=json")
	if err != nil {
		return "", fmt.Errorf("failed to fetch public IP: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		IP string `json:"ip"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to parse IP response: %w", err)
	}
	return result.IP, nil
}

func fetchFromIPInfo(ip string) (*IPInfo, error) {
	resp, err := http.Get(fmt.Sprintf("https://ipinfo.io/%s/json", ip))
	if err != nil {
		return nil, fmt.Errorf("IPinfo request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("IPinfo returned status %d", resp.StatusCode)
	}

	var data struct {
		IP       string `json:"ip"`
		City     string `json:"city"`
		Region   string `json:"region"`
		Country  string `json:"country"`
		Postal   string `json:"postal"`
		Loc      string `json:"loc"`
		Timezone string `json:"timezone"`
		Org      string `json:"org"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, fmt.Errorf("failed to parse IPinfo response: %w", err)
	}

	version := "IPv4"
	if strings.Contains(data.IP, ":") {
		version = "IPv6"
	}

	lat, lon := "", ""
	if parts := strings.SplitN(data.Loc, ",", 2); len(parts) == 2 {
		lat, lon = parts[0], parts[1]
	}

	return &IPInfo{
		IP:          data.IP,
		Version:     version,
		City:        data.City,
		Region:      data.Region,
		CountryName: data.Country,
		CountryCode: data.Country,
		Postal:      data.Postal,
		Latitude:    lat,
		Longitude:   lon,
		Timezone:    data.Timezone,
		Org:         data.Org,
		ASN:         data.Org,
	}, nil
}

func fetchFromIpapi(ip string) (*IPInfo, error) {
	resp, err := http.Get(fmt.Sprintf("https://ipapi.co/%s/json/", ip))
	if err != nil {
		return nil, fmt.Errorf("ipapi request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ipapi returned status %d", resp.StatusCode)
	}

	var data struct {
		IP          string  `json:"ip"`
		Version     string  `json:"version"`
		City        string  `json:"city"`
		Region      string  `json:"region"`
		CountryName string  `json:"country_name"`
		CountryCode string  `json:"country_code"`
		Postal      string  `json:"postal"`
		Latitude    float64 `json:"latitude"`
		Longitude   float64 `json:"longitude"`
		Timezone    string  `json:"timezone"`
		Org         string  `json:"org"`
		ASN         string  `json:"asn"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, fmt.Errorf("failed to parse ipapi response: %w", err)
	}

	return &IPInfo{
		IP:          data.IP,
		Version:     data.Version,
		City:        data.City,
		Region:      data.Region,
		CountryName: data.CountryName,
		CountryCode: data.CountryCode,
		Postal:      data.Postal,
		Latitude:    fmt.Sprintf("%f", data.Latitude),
		Longitude:   fmt.Sprintf("%f", data.Longitude),
		Timezone:    data.Timezone,
		Org:         data.Org,
		ASN:         data.ASN,
	}, nil
}

func detectVPN(org string) bool {
	lower := strings.ToLower(org)
	keywords := []string{"cloudflare", "amazon", "google", "digitalocean", "microsoft"}
	for _, kw := range keywords {
		if strings.Contains(lower, kw) {
			return true
		}
	}
	return false
}

func printIPInfo(info *IPInfo, provider string, raw bool) {
	if raw {
		b, _ := json.MarshalIndent(info, "", "  ")
		fmt.Println(string(b))
		return
	}

	fmt.Printf("Provider    : %s\n", provider)
	fmt.Println()
	fmt.Println("── Network Info ──────────────────────")
	fmt.Printf("IP          : %s\n", info.IP)
	fmt.Printf("Version     : %s\n", info.Version)
	fmt.Printf("ASN         : %s\n", info.ASN)
	fmt.Printf("Organization: %s\n", info.Org)
	fmt.Printf("Timezone    : %s\n", info.Timezone)
	fmt.Println()
	fmt.Println("── Location ──────────────────────────")
	fmt.Printf("Country     : %s\n", info.CountryName)
	fmt.Printf("Region      : %s\n", info.Region)
	fmt.Printf("City        : %s\n", info.City)
	fmt.Printf("Postal      : %s\n", info.Postal)
	fmt.Printf("Coordinates : %s, %s\n", info.Latitude, info.Longitude)

	if detectVPN(info.Org) {
		fmt.Println()
		fmt.Println("⚠  Shared hosting / VPN detected. Rate limiting may occur.")
	}
}

var rawFlag bool

var rootCmd = &cobra.Command{
	Use:   "ip",
	Short: "Inspect your public IP address and location",
	Long: `IP Inspector — pure CLI version of the IP Inspector web app.

Fetches your public IP via ipify.org, then resolves details via
ipinfo.io with automatic fallback to ipapi.co. Includes VPN/shared
hosting detection and a DNS lookup subcommand.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		ip, err := fetchPublicIP()
		if err != nil {
			return err
		}

		var info *IPInfo
		provider := "IPinfo"

		info, err = fetchFromIPInfo(ip)
		if err != nil {
			fmt.Fprintf(os.Stderr, "IPinfo failed (%v), falling back to ipapi...\n", err)
			info, err = fetchFromIpapi(ip)
			if err != nil {
				return fmt.Errorf("both providers failed: %w", err)
			}
			provider = "ipapi"
		}

		printIPInfo(info, provider, rawFlag)
		return nil
	},
}

// dnsCmd performs a DNS A-record lookup via Cloudflare DoH — mirrors fetchDNS() in React
var dnsCmd = &cobra.Command{
	Use:   "dns <domain>",
	Short: "DNS A-record lookup via Cloudflare DoH",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		domain := args[0]

		req, err := http.NewRequest("GET",
			fmt.Sprintf("https://cloudflare-dns.com/dns-query?name=%s&type=A", domain),
			nil,
		)
		if err != nil {
			return err
		}
		req.Header.Set("Accept", "application/dns-json")

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return fmt.Errorf("DNS lookup failed: %w", err)
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			return fmt.Errorf("failed to read DNS response: %w", err)
		}

		// Pretty-print JSON
		var pretty map[string]any
		if err := json.Unmarshal(body, &pretty); err != nil {
			fmt.Println(string(body))
			return nil
		}
		b, _ := json.MarshalIndent(pretty, "", "  ")
		fmt.Println(string(b))
		return nil
	},
}

func Execute() {
	err := rootCmd.Execute()
	if err != nil {
		os.Exit(1)
	}
}

func init() {
	rootCmd.Flags().BoolVarP(&rawFlag, "raw", "r", false, "Output raw JSON")
	rootCmd.AddCommand(dnsCmd)
}
